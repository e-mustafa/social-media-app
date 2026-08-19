import { GenericRepository, IPaginatedResult } from '../../DB/base.repository';
import { BadRequestException, NotFoundException } from '../../shared/response/exception.response';
import { Id } from '../../shared/types/validation.type';
import { IQueryDTO } from '../../shared/validation/general-fields.validation';
import { Block } from '../block/block.model';
import { IBlock } from '../block/block.types';
import { UserRepository } from '../user/user.repository';
import { IUser } from '../user/user.types';
import { FriendRequestStatusEnum } from './friend.enums';
import Friend from './friend.model';
import { IFriend } from './friend.types';

class FriendServices {
	constructor(
		private readonly FriendRepo: GenericRepository<IFriend> = new GenericRepository<IFriend>(Friend),
		private readonly UserRepo: UserRepository = new UserRepository(),
		private readonly BlockRepo: GenericRepository<IBlock> = new GenericRepository<IBlock>(Block),
	) {}

	async sendFriendRequest(userId: Id, targetUserId: Id): Promise<IFriend> {
		// Prevent sending a request to self
		if (userId.toString() === targetUserId.toString()) {
			throw new BadRequestException('You cannot send a friend request to yourself', 'sendFriendRequest');
		}

		// todo: add isFriends in friend repo

		// Fetch existing request and target/current user block/friend status in parallel
		const [targetUser, isBlocked, existRequest] = await Promise.all([
			this.UserRepo.findById(targetUserId).select('').lean().exec(),

			this.BlockRepo.findOne({
				$or: [
					{ blocker: userId, blocked: targetUserId },
					{ blocker: targetUserId, blocked: userId },
				],
			})
				.lean()
				.exec(),

			this.FriendRepo.findOne({
				$or: [
					{ sendBy: userId, sendTo: targetUserId },
					{ sendBy: targetUserId, sendTo: userId },
				],
			})
				.lean()
				.exec(),
		]);

		// check if target user exists and active
		if (!targetUser) {
			throw new NotFoundException('User not found', 'sendFriendRequest');
		}

		if (isBlocked) {
			// Check if current user has blocked target user
			if (isBlocked.blocker.toString() === userId.toString()) {
				throw new BadRequestException('You have blocked this user', 'sendFriendRequest');
			} else {
				// if target user has blocked current user (mask error as NotFound for security)
				throw new NotFoundException('User not found', 'sendFriendRequest');
			}
		}

		// check if users already friends (status == accepted)
		if (existRequest && existRequest.status === FriendRequestStatusEnum.REJECTED) {
			throw new BadRequestException('You are already friends', 'sendFriendRequest');
		}

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

		// Create and return the new friend request
		const request = await this.FriendRepo.create({ sendBy: userId, sendTo: targetUserId });
		return request;
	}

	async getMyFriends(userId: Id, { page = 1, limit = 10 }: IQueryDTO) {
		const friends = await this.FriendRepo.find({
			$or: [{ sendBy: userId }, { sendTo: userId }],
			status: FriendRequestStatusEnum.ACCEPTED,
		})
			.lean()
			.populate<IFriend & { sendBy: Partial<IUser> }>({ path: 'sendBy', select: 'firstName lastName avatar gender' })
			.paginate(page, limit)
			.exec();
		return friends;
	}

	async getReceivedRequests(userId: Id, { page = 1, limit = 10 }: IQueryDTO): Promise<IPaginatedResult<IFriend[]>> {
		const requests = await this.FriendRepo.find({ sendTo: userId, status: FriendRequestStatusEnum.PENDING })
			.lean()
			.populate<IFriend & { sendBy: Partial<IUser> }>({ path: 'sendBy', select: 'firstName lastName avatar gender' })
			.paginate(page, limit)
			.exec();
		return requests;
	}

	async getSentRequests(userId: Id, { page = 1, limit = 10 }: IQueryDTO): Promise<IPaginatedResult<IFriend[]>> {
		const requests = await this.FriendRepo.find({ sendBy: userId, status: FriendRequestStatusEnum.PENDING })
			.lean()
			.populate<IFriend & { sendTo: Partial<IUser> }>({ path: 'sendTo', select: 'firstName lastName avatar gender' })
			.paginate(page, limit)
			.exec();
		return requests;
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

		// 4.Update request in database
		const updated = await this.FriendRepo.findByIdAndUpdate(reqId, { status: FriendRequestStatusEnum.ACCEPTED })
			.lean()
			.exec();

		return updated;
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

export default new FriendServices();
