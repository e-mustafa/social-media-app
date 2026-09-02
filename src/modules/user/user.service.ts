import { QueryFilter } from 'mongoose';
import { BadRequestException, NotFoundException } from '../../shared/response/exception.response';
import { Id, IFile, IPaginatedResult } from '../../shared/types';
import { IQueryDTO, objectIdRegex } from '../../shared/validation/general-fields.validation';
import { encrypt } from '../../utils/security/encryption.security';
import cloudinary, { uploadUserProfileMedia } from '../../utils/upload-files/cloudinary';
import { blockRepository, BlockRepository } from '../block';
import chatSocketService from '../chat/chat.socket.service';
import userRepository, { UserRepository } from './user.repository';
import { IGeneralUser, IUser, IUserDocument } from './user.types';
import { IUpdateProfileDTO } from './user.validation';

const selectUserInfo = 'firstName lastName email phone username bio gender avatar cover role';
export const selectGeneralUserInfo = 'firstName lastName username bio gender avatar cover';
class UserServices {
	constructor(
		private readonly UserRepo: UserRepository = userRepository,
		private readonly BlockRepo: BlockRepository = blockRepository,
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

	async getUserStatus(userId: Id, targetUserId: string): Promise<{ isOnline: boolean; lastSeenAt: Date | null }> {
		const isBlocked = await this.BlockRepo.isBlocked(userId, targetUserId);
		if (isBlocked) throw new NotFoundException('User not found', 'Get-user-status');

		const targetUser = await this.UserRepo.findOne({ _id: targetUserId }).lean().select('_id lastSeenAt').exec();
		if (!targetUser) throw new NotFoundException('User not found', 'Get-user-status');

		const isOnline = await chatSocketService.isUserOnline(targetUser._id);

		return { isOnline, lastSeenAt: targetUser.lastSeenAt ?? null };
	}
}

export default new UserServices();
