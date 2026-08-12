import { QueryFilter } from 'mongoose';
import { GenericRepository, IPaginatedResult } from '../../DB/base.repository';
import { BadRequestException, NotFoundException } from '../../utils/response/exception.response';
import { decrypt, encrypt } from '../../utils/security/encryption.security';
import { Id } from '../../utils/types/shared.type';
import cloudinary, { uploadToCloudinary } from '../../utils/upload-files/cloudinary';
import { IQueryDTO } from '../../utils/validation/general-fields.validation';
import Friendship from '../friendship/friendship.model';
import { IFriendship } from '../friendship/friendship.types';
import { UserStatusEnum } from './user.enums';
import { UserRepository } from './user.repository';
import { IGeneralUser, IUser, IUserDocument } from './user.types';
import { IUpdateProfileDTO } from './user.validation';

const selectUserInfo = 'firstName lastName email phone username bio gender avatar cover role';
const selectGeneralUserInfo = 'firstName lastName username bio gender avatar cover';
class UserServices {
	constructor(
		private readonly userRepo: UserRepository = new UserRepository(),
		private readonly FriendshipRepo = new GenericRepository<IFriendship>(Friendship),
	) {}

	async updateProfile(userId: Id, user: IUpdateProfileDTO): Promise<IUser> {
		const { firstName, lastName, username, gender, bio, birthdate, phone } = user || {};
		let phoneNum = phone;
		if (phone && !phone.startsWith('enc:')) {
			phoneNum = encrypt(phone);
		}

		const updatedUser = await this.userRepo
			.findByIdAndUpdate(userId, {
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

		if (updatedUser?.phone?.startsWith('enc:')) updatedUser.phone = decrypt(updatedUser.phone);
		return updatedUser;
	}

	async uploadUserImg(userId: Id, file: Express.Multer.File): Promise<IUser> {
		const fieldname = file.fieldname;
		const { id, url } = await uploadToCloudinary(file, userId, `${fieldname}_${userId}`);
		const updatedUser = await this.userRepo
			.findByIdAndUpdate(userId, { [fieldname]: { id, url } })
			.lean()
			.select(fieldname)
			.exec();

		if (!updatedUser) {
			throw new BadRequestException('Failed to upload image', 'Upload-user-img');
		}

		return updatedUser;
	}

	async deleteUserImg(user: IUser | IUserDocument, fieldname: 'avatar' | 'cover'): Promise<IUser> {
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

		const updatedUser = await this.userRepo
			.findByIdAndUpdate(user._id, { $set: { [fieldname]: null } })
			.select(fieldname)
			.exec();

		if (!updatedUser) {
			throw new NotFoundException('User not found', 'Delete-user-img');
		}

		return updatedUser;
	}

	// Block -------------------------------------------------
	async getBlockUsers(userId: Id, { page, limit, search }: IQueryDTO): Promise<IPaginatedResult<IGeneralUser[]>> {
		const myUser = await this.userRepo.findById(userId).lean().select('blockedUsers').exec();
		if (!myUser) throw new NotFoundException('User not found', 'getMyFriends');

		const blockedIds = myUser?.blockedUsers || [];

		// Return early empty pagination payload if the user has no blocked
		if (!blockedIds.length) {
			return {
				data: [],
				metadata: {
					page,
					limit,
					total: 0,
					totalPages: 0,
					hasNext: false,
					hasPrev: false,
				},
			};
		}

		// Build direct filter targeting blocked IDs and ignoring blocked status
		const filter: QueryFilter<IGeneralUser> = { _id: { $in: blockedIds }, blockedUsers: { $nin: [userId] } };

		// Apply search filters directly against the target friend fields
		if (search && search.trim()) {
			const searchRegex = { $regex: search.trim(), $options: 'i' };
			filter.$or = [{ username: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
		}

		// Execute pagination query on User collection directly for optimal performance
		const data = await this.userRepo.find(filter).lean<IGeneralUser>().select(selectGeneralUserInfo).paginate(page, limit).exec();
		return data;
	}

	async blockUser(userId: Id, targetUserId: string): Promise<IUser> {
		// 1. Prevent self-blocking
		if (userId.toString() === targetUserId.toString()) {
			throw new BadRequestException('You cannot block yourself', 'Block-user');
		}

		// 2. Check block status
		const [currentUser, targetUser] = await Promise.all([
			this.userRepo
				.findOne({ _id: userId, blockedUsers: { $nin: [targetUserId] } })
				.lean()
				.exec(),
			this.userRepo
				.findOne({ _id: targetUserId, blockedUsers: { $nin: [userId] } })
				.lean()
				.exec(),
		]);

		if (!currentUser) {
			throw new NotFoundException('You have already blocked this user', 'Block-user');
		}

		if (!targetUser) {
			throw new NotFoundException('User not found', 'Block-user');
		}

		// 4. Construct write operations array safely
		const updatePromises: Promise<unknown>[] = [
			// Primary query: Update current user's blocked and friends lists (Always index 0)
			this.userRepo
				.findByIdAndUpdate(
					userId,
					{ $addToSet: { blockedUsers: targetUserId }, $pull: { friends: targetUserId } },
					{ runValidators: false },
				)
				.select('blockedUsers friends')
				.lean()
				.exec(),

			// Delete any pending or accepted friendship records between the two users
			this.FriendshipRepo.deleteMany({
				$or: [
					{ sendBy: userId, sentTo: targetUserId },
					{ sendBy: targetUserId, sentTo: userId },
				],
			}),
		];

		// Remove current user from target user's friends list if friendship existed
		if (targetUser.friends?.some((id) => id.toString() === userId.toString())) {
			updatePromises.push(this.userRepo.updateOne({ _id: targetUserId }, { $pull: { friends: userId } }));
		}

		// 5. Execute all updates concurrently
		const [updatedUser] = await Promise.all(updatePromises);

		if (!updatedUser) {
			throw new NotFoundException('Failed to update user profile', 'Block-user');
		}

		return updatedUser as unknown as IUser;
	}

	async unblockUser(userId: Id, targetUserId: string): Promise<Partial<IUser>> {
		if (userId.toString() === targetUserId.toString()) {
			throw new BadRequestException('You cannot unblock yourself', 'Unblock-user');
		}

		const user = await this.userRepo.findOne({ _id: userId }).lean().exec();
		if (!user || !user.blockedUsers) {
			throw new BadRequestException('User not found', 'Unblock-user');
		}

		if (!user.blockedUsers.some((id) => id.toString() === targetUserId.toString())) {
			throw new BadRequestException('You have not blocked this user', 'Unblock-user');
		}

		const updatedUser = await this.userRepo
			.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetUserId } }, { runValidators: false })
			.select('blockedUsers')
			.lean()
			.exec();

		if (!updatedUser) {
			throw new NotFoundException('Failed to update user profile', 'Unblock-user');
		}

		return updatedUser;
	}

	// Get User/s - visit user ------------------------------------------------
	async getUser(targetUserId: string, userId: Id): Promise<IUser> {
		const [targetUser, myUser] = await Promise.all([
			// Check if target exist and has not block the current user
			this.userRepo
				.findOne({ _id: targetUserId, blockedUsers: { $nin: [userId] } })
				.select(selectUserInfo)
				.lean()
				.exec(),
			// Check if current user has blocked the target user
			this.userRepo
				.findOne({ _id: userId, blockedUsers: { $nin: [targetUserId] } })
				.lean()
				.exec(),
		]);

		if (!targetUser || !myUser) {
			throw new NotFoundException('User not found', 'Get-user');
		}
		return targetUser;
	}

	async getUsers(user: IUser, { page = 1, limit = 10, search }: IQueryDTO): Promise<IPaginatedResult<Partial<IUser>[]>> {
		const filter: QueryFilter<IUser> = { _id: { $ne: user._id }, blockedUsers: { $nin: [user._id] } };
		if (search && search.trim()) {
			const searchRegex = { $regex: search.trim(), $options: 'i' };
			filter.$or = [{ username: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
		}
		const users = await this.userRepo.find(filter).lean().select(selectUserInfo).paginate(page, limit).exec();
		return users;
	}

	// Friends -------------------------------------------
	async getMyFriends(userId: Id, { page = 1, limit = 10, search }: IQueryDTO): Promise<IPaginatedResult<Partial<IUser>[]>> {
		const myUser = await this.userRepo.findById(userId).lean().select('friends').exec();
		if (!myUser) throw new NotFoundException('User not found', 'getMyFriends');

		const friendIds = myUser?.friends || [];

		// Return early empty pagination payload if the user has no friends
		if (!friendIds.length) {
			return {
				data: [],
				metadata: {
					page,
					limit,
					total: 0,
					totalPages: 0,
					hasNext: false,
					hasPrev: false,
				},
			};
		}

		// Build direct filter targeting friend IDs and ignoring blocked status
		const filter: QueryFilter<IUser> = { _id: { $in: friendIds }, blockedUsers: { $nin: [userId] } };

		// Apply search filters directly against the target friend fields
		if (search && search.trim()) {
			const searchRegex = { $regex: search.trim(), $options: 'i' };
			filter.$or = [{ username: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
		}

		// Execute pagination query on User collection directly for optimal performance
		const data = await this.userRepo.find(filter).lean().select(selectUserInfo).paginate(page, limit).exec();
		return data;
	}

	async removeFriend(userId: Id, targetUserId: Id): Promise<IUser> {
		const [targetUser, myUser] = await Promise.all([
			this.userRepo
				.findOne({ _id: targetUserId, blockedUsers: { $nin: [userId] } })
				.lean()
				.exec(),
			this.userRepo
				.findOne({ _id: userId, blockedUsers: { $nin: [targetUserId] } }, { ignoreDefaultFilters: true })
				.lean()
				.exec(),
		]);

		if (!targetUser) {
			throw new NotFoundException('User not found', 'Deactivate-my-account');
		}

		if (!myUser || myUser?.deletedAt) {
			throw new NotFoundException('User not found', 'Deactivate-my-account');
		}

		if (myUser.status !== UserStatusEnum.ACTIVE) {
			throw new BadRequestException('Your account is not active, you can not make changes.', 'Deactivate-my-account');
		}

		const updated = await this.userRepo
			.findByIdAndUpdate(userId, { friends: { $pull: targetUserId } })
			.select('friends')
			.lean()
			.exec();

		if (!updated) {
			throw new BadRequestException('failed to remove friend', 'Remove-friend');
		}

		return updated;
	}
}

export default new UserServices();
