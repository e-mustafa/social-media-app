import { QueryFilter } from 'mongoose';
import { GenericRepository } from '../../DB/base.repository';
import { BadRequestException, NotFoundException } from '../../shared/response/exception.response';
import { Id, IFile, IPaginatedResult } from '../../shared/types';
import { IQueryDTO, objectIdRegex } from '../../shared/validation/general-fields.validation';
import { encrypt } from '../../utils/security/encryption.security';
import cloudinary, { uploadUserProfileMedia } from '../../utils/upload-files/cloudinary';
import { Block } from '../block/block.model';
import { IBlock } from '../block/block.types';
import userRepository, { UserRepository } from './user.repository';
import { IGeneralUser, IUser, IUserDocument } from './user.types';
import { IUpdateProfileDTO } from './user.validation';

const selectUserInfo = 'firstName lastName email phone username bio gender avatar cover role';
export const selectGeneralUserInfo = 'firstName lastName username bio gender avatar cover';
class UserServices {
	constructor(
		private readonly UserRepo: UserRepository = userRepository,
		private readonly BlockRepo: GenericRepository<IBlock> = new GenericRepository(Block),
	) {}

	async updateProfile(userId: Id, user: IUpdateProfileDTO): Promise<IUser> {
		const { firstName, lastName, username, gender, bio, birthdate, phone } = user || {};
		let phoneNum = phone;
		if (phone && !phone.startsWith('enc:')) {
			phoneNum = encrypt(phone);
		}

		const updatedUser = await this.UserRepo.findByIdAndUpdate(userId, {
			firstName,
			lastName,
			username,
			gender,
			bio,
			birthdate,
			phone: phoneNum,
		})
			.lean()
			.select(selectUserInfo)
			.exec();

		if (!updatedUser) {
			throw new NotFoundException('User not found', 'Update-profile');
		}

		// if (updatedUser?.phone?.startsWith('enc:')) updatedUser.phone = decrypt(updatedUser.phone);
		return updatedUser;
	}

	async uploadUserPic(userId: Id, file: IFile): Promise<IUser> {
		const fieldname = file?.fieldname as 'avatar' | 'cover';
		const { id, url } = await uploadUserProfileMedia(file, userId, fieldname);

		const updatedUser = await this.UserRepo.findByIdAndUpdate(userId, { [fieldname]: { id, url } })
			.lean()
			.select(fieldname)
			.exec();

		if (!updatedUser) {
			throw new BadRequestException('Failed to upload image', 'Upload-user-img');
		}

		return updatedUser;
	}

	async deleteUserPic(user: IUser | IUserDocument, fieldname: 'avatar' | 'cover'): Promise<IUser> {
		if (!user?.[fieldname]?.id) {
			throw new NotFoundException('You do/not have a ' + fieldname, 'Delete-user-img');
		}

		await cloudinary.uploader
			.destroy(user?.[fieldname]?.id || `${fieldname}_${user._id}`, {
				resource_type: 'image',
				invalidate: true,
			})
			.catch((error) => {
				console.error('Error deleting image from Cloudinary:', error);
			});

		const updatedUser = await this.UserRepo.findByIdAndUpdate(user._id, { $set: { [fieldname]: null } })
			.select(fieldname)
			.exec();

		if (!updatedUser) {
			throw new NotFoundException('User not found', 'Delete-user-img');
		}

		return updatedUser;
	}

	// Get User/s - visit user ------------------------------------------------
	async getUser(targetUserId: string, userId: Id): Promise<IUser> {
		// const [targetUser, isBlocked] = await Promise.all([
		// Check if target exist
		// this.UserRepo.findById(targetUserId).lean().select(selectUserInfo).exec(),
		// this.UserRepo.findOne({ $or: [{ _id: targetUserId }, { username: targetUserId }] })
		// 	.lean()
		// 	.select(selectUserInfo)
		// 	.exec(),

		// Check if current user has blocked the target user
		// this.BlockRepo.findOne({
		// 	$or: [
		// 		{ blocker: targetUserId, blocked: userId },
		// 		{ blocker: userId, blocked: targetUserId },
		// 	],
		// })
		// 	.lean()
		// 	.exec(),
		// ]);

		const isId = objectIdRegex.test(targetUserId);

		const filter = isId ? { _id: targetUserId } : { username: targetUserId };

		const targetUser = await this.UserRepo.findOne(filter).lean().select(selectUserInfo).exec();
		if (!targetUser) throw new NotFoundException('User not found', 'Get-user');

		const isBlocked = await this.BlockRepo.findOne({
			$or: [
				{ blocker: targetUser._id, blocked: userId },
				{ blocker: userId, blocked: targetUser._id },
			],
		})
			.lean()
			.exec();
		if (isBlocked) throw new NotFoundException('User not found', 'Get-user');

		return targetUser;
	}

	async getUsers(userId: Id, { page = 1, limit = 10, search }: IQueryDTO): Promise<IPaginatedResult<IGeneralUser>> {
		// 1. Query block records to find all bidirectional block relationships
		const blocks = await this.BlockRepo.find({
			$or: [{ blocker: userId }, { blocked: userId }],
		})
			.select('blocker blocked')
			.lean()
			.exec();

		// 2. Map blocks to extract the target user ObjectIds
		const blockedUserIds: Id[] = blocks.map((block) =>
			block.blocker.toString() === userId.toString() ? block.blocked : block.blocker,
		);

		// 3. Build query filter utilizing $nin operator
		const filter: QueryFilter<IUser> = {
			_id: { $nin: [userId, ...blockedUserIds] },
		};

		if (search && search.trim()) {
			const searchRegex = { $regex: search.trim(), $options: 'i' };
			filter.$or = [{ username: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
		}

		// 4. Execute query through user repository with pagination
		const users = await this.UserRepo.find(filter).lean().select(selectUserInfo).paginate(page, limit).exec();

		return users;
	}

	// Block -------------------------------------------------
	// async getBlockUsers(userId: Id, { page, limit, search }: IQueryDTO): Promise<IPaginatedResult<IGeneralUser[]>> {
	// 	const myUser = await this.UserRepo.findById(userId).lean().select('blockedUsers').exec();
	// 	if (!myUser) throw new NotFoundException('User not found', 'getMyFriends');

	// 	const blockedIds = myUser?.blockedUsers || [];

	// 	// Return early empty pagination payload if the user has no blocked
	// 	if (!blockedIds.length) {
	// 		return {
	// 			data: [],
	// 			metadata: {
	// 				page,
	// 				limit,
	// 				total: 0,
	// 				totalPages: 0,
	// 				hasNext: false,
	// 				hasPrev: false,
	// 			},
	// 		};
	// 	}

	// 	// Build direct filter targeting blocked IDs and ignoring blocked status
	// 	const filter: QueryFilter<IGeneralUser> = { _id: { $in: blockedIds }, blockedUsers: { $nin: [userId] } };

	// 	// Apply search filters directly against the target friend fields
	// 	if (search && search.trim()) {
	// 		const searchRegex = { $regex: search.trim(), $options: 'i' };
	// 		filter.$or = [{ username: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
	// 	}

	// 	// Execute pagination query on User collection directly for optimal performance
	// 	const data = await this.UserRepo
	// 		.find(filter)
	// 		.lean<IGeneralUser>()
	// 		.select(selectGeneralUserInfo)
	// 		.paginate(page, limit)
	// 		.exec();
	// 	return data;
	// }

	// async blockUser(userId: Id, targetUserId: string): Promise<IUser> {
	// 	// 1. Prevent self-blocking
	// 	if (userId.toString() === targetUserId.toString()) {
	// 		throw new BadRequestException('You cannot block yourself', 'Block-user');
	// 	}

	// 	// 2. Check block status
	// 	const [currentUser, targetUser] = await Promise.all([
	// 		this.UserRepo
	// 			.findOne({ _id: userId, blockedUsers: { $nin: [targetUserId] } })
	// 			.lean()
	// 			.exec(),
	// 		this.UserRepo
	// 			.findOne({ _id: targetUserId, blockedUsers: { $nin: [userId] } })
	// 			.lean()
	// 			.exec(),
	// 	]);

	// 	if (!currentUser) {
	// 		throw new NotFoundException('You have already blocked this user', 'Block-user');
	// 	}

	// 	if (!targetUser) {
	// 		throw new NotFoundException('User not found', 'Block-user');
	// 	}

	// 	// 4. Construct write operations array safely
	// 	const updatePromises: Promise<unknown>[] = [
	// 		// Primary query: Update current user's blocked and friends lists (Always index 0)
	// 		this.UserRepo
	// 			.findByIdAndUpdate(
	// 				userId,
	// 				{ $addToSet: { blockedUsers: targetUserId }, $pull: { friends: targetUserId } },
	// 				{ runValidators: false },
	// 			)
	// 			.select('blockedUsers friends')
	// 			.lean()
	// 			.exec(),

	// 		// Delete any pending or accepted friend records between the two users
	// 		this.FriendRepo.deleteMany({
	// 			$or: [
	// 				{ sendBy: userId, sentTo: targetUserId },
	// 				{ sendBy: targetUserId, sentTo: userId },
	// 			],
	// 		}),
	// 	];

	// 	// Remove current user from target user's friends list if friend existed
	// 	if (targetUser.friends?.some((id) => id.toString() === userId.toString())) {
	// 		updatePromises.push(this.UserRepo.updateOne({ _id: targetUserId }, { $pull: { friends: userId } }));
	// 	}

	// 	// 5. Execute all updates concurrently
	// 	const [updatedUser] = await Promise.all(updatePromises);

	// 	if (!updatedUser) {
	// 		throw new NotFoundException('Failed to update user profile', 'Block-user');
	// 	}

	// 	return updatedUser as unknown as IUser;
	// }

	// async unblockUser(userId: Id, targetUserId: string): Promise<Partial<IUser>> {
	// 	if (userId.toString() === targetUserId.toString()) {
	// 		throw new BadRequestException('You cannot unblock yourself', 'Unblock-user');
	// 	}

	// 	const user = await this.UserRepo.findOne({ _id: userId }).lean().exec();
	// 	if (!user || !user.blockedUsers) {
	// 		throw new BadRequestException('User not found', 'Unblock-user');
	// 	}

	// 	if (!user.blockedUsers.some((id) => id.toString() === targetUserId.toString())) {
	// 		throw new BadRequestException('You have not blocked this user', 'Unblock-user');
	// 	}

	// 	const updatedUser = await this.UserRepo
	// 		.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetUserId } }, { runValidators: false })
	// 		.select('blockedUsers')
	// 		.lean()
	// 		.exec();

	// 	if (!updatedUser) {
	// 		throw new NotFoundException('Failed to update user profile', 'Unblock-user');
	// 	}

	// 	return updatedUser;
	// }

	// Friends -------------------------------------------
	// async getMyFriends(userId: Id, { page = 1, limit = 10, search }: IQueryDTO): Promise<IPaginatedResult<Partial<IUser>[]>> {
	// 	const myUser = await this.UserRepo.findById(userId).lean().select('friends').exec();
	// 	if (!myUser) throw new NotFoundException('User not found', 'getMyFriends');

	// 	const friendIds = myUser?.friends || [];

	// 	// Return early empty pagination payload if the user has no friends
	// 	if (!friendIds.length) {
	// 		return {
	// 			data: [],
	// 			metadata: {
	// 				page,
	// 				limit,
	// 				total: 0,
	// 				totalPages: 0,
	// 				hasNext: false,
	// 				hasPrev: false,
	// 			},
	// 		};
	// 	}

	// 	// Build direct filter targeting friend IDs and ignoring blocked status
	// 	const filter: QueryFilter<IUser> = { _id: { $in: friendIds }, blockedUsers: { $nin: [userId] } };

	// 	// Apply search filters directly against the target friend fields
	// 	if (search && search.trim()) {
	// 		const searchRegex = { $regex: search.trim(), $options: 'i' };
	// 		filter.$or = [{ username: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
	// 	}

	// 	// Execute pagination query on User collection directly for optimal performance
	// 	const data = await this.UserRepo.find(filter).lean().select(selectUserInfo).paginate(page, limit).exec();
	// 	return data;
	// }

	// async removeFriend(userId: Id, targetUserId: Id): Promise<IUser> {
	// 	const [targetUser, myUser] = await Promise.all([
	// 		this.UserRepo
	// 			.findOne({ _id: targetUserId, blockedUsers: { $nin: [userId] } })
	// 			.lean()
	// 			.exec(),
	// 		this.UserRepo
	// 			.findOne({ _id: userId, blockedUsers: { $nin: [targetUserId] } }, { ignoreDefaultFilters: true })
	// 			.lean()
	// 			.exec(),
	// 	]);

	// 	if (!targetUser) {
	// 		throw new NotFoundException('User not found', 'Deactivate-my-account');
	// 	}

	// 	if (!myUser || myUser?.deletedAt) {
	// 		throw new NotFoundException('User not found', 'Deactivate-my-account');
	// 	}

	// 	if (myUser.status !== UserStatusEnum.ACTIVE) {
	// 		throw new BadRequestException('Your account is not active, you can not make changes.', 'Deactivate-my-account');
	// 	}

	// 	const updated = await this.UserRepo
	// 		.findByIdAndUpdate(userId, { friends: { $pull: targetUserId } })
	// 		.select('friends')
	// 		.lean()
	// 		.exec();

	// 	if (!updated) {
	// 		throw new BadRequestException('failed to remove friend', 'Remove-friend');
	// 	}

	// 	return updated;
	// }
}

export default new UserServices();
