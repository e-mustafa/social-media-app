import { GenericRepository, IPaginatedResult } from '../../DB/base.repository';
import { BadRequestException, NotFoundException } from '../../utils/response/exception.response';
import { Id } from '../../utils/types/shared.type';
import { IQueryDTO } from '../../utils/validation/general-fields.validation';
import { UserRepository } from '../user/user.repository';
import { FriendRequestStatusEnum } from './friendship.enums';
import Friendship from './friendship.model';
import { IFriendship, IUserLeanResult } from './friendship.types';

class FriendshipServices {
	constructor(
		private readonly FriendRepo = new GenericRepository<IFriendship>(Friendship),
		private readonly UserRepo = new UserRepository(),
	) {}

	async getReceivedRequests(userId: Id, { page = 1, limit = 10 }: IQueryDTO): Promise<IPaginatedResult<IFriendship[]>> {
		const requests = await this.FriendRepo.find({ sendTo: userId, status: FriendRequestStatusEnum.PENDING })
			.lean()
			.paginate(page, limit)
			.populate({ path: 'sendBy', select: 'firstName lastName avatar gender' })
			.exec();
		return requests;
	}

	async getSentRequests(userId: Id, { page = 1, limit = 10 }: IQueryDTO): Promise<IPaginatedResult<IFriendship[]>> {
		const requests = await this.FriendRepo.find({ sendBy: userId, status: FriendRequestStatusEnum.PENDING })
			.lean()
			.populate({ path: 'sendTo', select: 'firstName lastName avatar gender' })
			.paginate(page, limit)
			.exec();
		return requests;
	}

	async sendFriendRequest(userId: Id, targetUserId: Id): Promise<IFriendship> {
		// Prevent sending a request to self
		if (userId.toString() === targetUserId.toString()) {
			throw new BadRequestException('You cannot send a friend request to yourself', 'sendFriendRequest');
		}

		// Fetch existing request and target/current user block/friend status in parallel
		const [existRequest, users] = await Promise.all([
			this.FriendRepo.findOne({
				$or: [
					{ sendBy: userId, sendTo: targetUserId },
					{ sendBy: targetUserId, sendTo: userId },
				],
			})
				.lean()
				.exec(),
			this.UserRepo.find({
				_id: { $in: [targetUserId, userId] },
			})
				.select({
					blockedUsers: 1,
					// Projection via $elemMatch omits the 'friends' key entirely if no match is found
					friends: { $elemMatch: { $in: [targetUserId, userId] } },
				})
				.lean<IUserLeanResult[]>()
				.exec(),
		]);

		// Check if current user already sent a request or had a previous rejected request
		if (existRequest && existRequest.sendBy.toString() === userId.toString()) {
			if (existRequest.status === FriendRequestStatusEnum.PENDING) {
				throw new BadRequestException('Friend request already sent', 'sendFriendRequest');
			} else if (existRequest.status === FriendRequestStatusEnum.REJECTED) {
				throw new BadRequestException(
					'Your previous friend request was rejected. You cannot send another request',
					'sendFriendRequest',
				);
			}
		}

		// Check if target user already sent a request to current user
		if (existRequest && existRequest.sendTo.toString() === userId.toString()) {
			if (existRequest.status === FriendRequestStatusEnum.PENDING) {
				throw new BadRequestException('There is a pending friend request from this user', 'sendFriendRequest');
			}

			// If previous request was rejected by current user, clean up old record to allow a new attempt
			if (existRequest.status === FriendRequestStatusEnum.REJECTED) {
				await this.FriendRepo.deleteOne({ _id: existRequest._id });
			}
		}

		// Ensure both users exist in the database
		if (!users || users.length < 2) {
			throw new NotFoundException('User not found', 'sendFriendRequest');
		}

		const currentUser = users.find((user) => user._id.toString() === userId.toString());
		const targetUser = users.find((user) => user._id.toString() === targetUserId.toString());

		// Check if current user has blocked target user
		if (currentUser?.blockedUsers?.some((id: Id) => id.toString() === targetUserId.toString())) {
			throw new BadRequestException('You have blocked this user', 'sendFriendRequest');
		}

		// Check if target user has blocked current user (mask error as NotFound for security)
		if (targetUser?.blockedUsers?.some((id: Id) => id.toString() === userId.toString())) {
			throw new NotFoundException('User not found', 'sendFriendRequest');
		}

		// Check if they are already friends
		const isAlreadyFriends = Boolean(
			(currentUser?.friends && currentUser.friends.length > 0) || (targetUser?.friends && targetUser.friends.length > 0),
		);

		if (isAlreadyFriends) {
			throw new BadRequestException('You are already friends', 'sendFriendRequest');
		}

		// Create and return the new friend request
		const request = await this.FriendRepo.create({ sendBy: userId, sendTo: targetUserId });
		return request;
	}

	async deleteFriendRequest(userId: Id, reqId: Id) {
		// 1. Fetch friend request
		const request = await this.FriendRepo.findOne({ _id: reqId, status: FriendRequestStatusEnum.PENDING }).lean().exec();
		if (!request) {
			throw new NotFoundException('Friend request not found', 'deleteFriendRequest');
		}

		// 2. Validate user authorization
		if (userId.toString() !== request.sendBy.toString()) {
			throw new BadRequestException(
				'Friend request not found or You are not authorized to delete it.',
				'deleteFriendRequest',
			);
		}

		if (request.status !== FriendRequestStatusEnum.PENDING) {
			throw new BadRequestException('Friend request is not pending', 'deleteFriendRequest');
		}

		// 3. Delete the friend request
		await this.FriendRepo.deleteOne({ _id: reqId });
		return;
	}

	async acceptFriendRequest(userId: Id, reqId: Id) {
		// 1. Fetch friend request
		const request = await this.FriendRepo.findById(reqId).lean().exec();
		if (!request) {
			throw new NotFoundException('Friend request not found', 'acceptFriendRequest');
		}

		// 2. Validate user authorization
		if (userId.toString() !== request.sendTo.toString()) {
			throw new BadRequestException('You are not authorized to accept this friend request', 'acceptFriendRequest');
		}

		// 3. Ensure the request is pending
		if (request.status !== FriendRequestStatusEnum.PENDING) {
			throw new BadRequestException('Friend request is no longer pending', 'acceptFriendRequest');
		}

		// 4. Use Mongoose Transaction for atomic multi-document updates
		const updateUser = await this.UserRepo.withTransaction(async (session) => {
			// Update target user (sender of the request)
			const updateTarget = await this.UserRepo.findByIdAndUpdate(
				request.sendBy,
				{
					$addToSet: { friends: request.sendTo },
				},
				{ session },
			)
				.lean()
				.exec();

			if (!updateTarget) {
				throw new NotFoundException('User not found', 'acceptFriendRequest');
			}

			// Update current user (receiver of the request)
			const updateUser = await this.UserRepo.findByIdAndUpdate(
				userId,
				{ $addToSet: { friends: request.sendBy } },
				{ session },
			)
				.select('friends')
				.lean()
				.exec();

			if (!updateUser) {
				throw new NotFoundException('User not found', 'acceptFriendRequest');
			}

			// Delete the processed friend request record
			await this.FriendRepo.deleteOne({ _id: reqId }, { session });

			// Commit transaction
			await session.commitTransaction();

			return updateUser;
		});

		return updateUser;
	}

	async rejectFriendRequest(userId: Id, reqId: Id) {
		// 1. Fetch friend request
		const request = await this.FriendRepo.findById(reqId).lean().exec();
		if (!request) {
			throw new NotFoundException('Friend request not found', 'acceptFriendRequest');
		}

		// 2. Validate user authorization
		if (userId.toString() !== request.sendTo.toString()) {
			throw new BadRequestException('You are not authorized to accept this friend request', 'acceptFriendRequest');
		}

		// 3. Ensure the request is pending
		if (request.status !== FriendRequestStatusEnum.PENDING) {
			throw new BadRequestException('Friend request is no longer pending', 'acceptFriendRequest');
		}

		// 4. reject the friend request
		await this.FriendRepo.updateOne({ _id: reqId }, { status: FriendRequestStatusEnum.REJECTED });

		return true;
	}
}

export default new FriendshipServices();
