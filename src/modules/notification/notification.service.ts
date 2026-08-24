import { QueryFilter } from 'mongoose';
import { NotFoundException } from '../../shared/response/exception.response';
import { Id, IPaginatedResult } from '../../shared/types';
import { selectGeneralUserInfo, userRepository } from '../user';
import notifyRepository from './notification.repository';
import { INotification, INotificationWSender } from './notification.types';
import { IGetNotificationsQueryDTO } from './notification.validation';

class NotificationServices {
	constructor(
		private readonly NotifyRepo = notifyRepository,
		private readonly UserRepo = userRepository,
	) {}

	// DeviceToken -------------------------------------------
	addDeviceToken(userId: Id, token: string) {
		return this.UserRepo.updateOne({ _id: userId }, { $addToSet: { deviceTokens: token } });
	}

	removeDeviceToken(userId: Id, token: string) {
		return this.UserRepo.updateOne({ _id: userId }, { $pull: { deviceTokens: token } });
	}

	// Notification -------------------------------------------
	async listNotifications(
		userId: Id,
		{ page = 1, limit = 10, unreadOnly, order }: IGetNotificationsQueryDTO,
	): Promise<IPaginatedResult<INotification> & { unread: number }> {
		const filter: QueryFilter<INotification> = { sendTo: userId };
		if (unreadOnly) filter.$or = [{ readAt: { $exists: false } }, { readAt: null }];

		const [result, unread] = await Promise.all([
			this.NotifyRepo.find(filter)
				.lean()
				.sort({ createdAt: order === 'asc' ? 1 : -1 })
				.paginate(page, limit)
				.populate<INotificationWSender>({ path: 'sendBy', select: selectGeneralUserInfo })
				.exec(),
			// get unread count
			this.NotifyRepo.countDocuments({ sendTo: userId, $or: [{ readAt: { $exists: false } }, { readAt: null }] }),
		]);

		return { unread, ...result };
	}

	async unreadCount(userId: Id) {
		return await this.NotifyRepo.countDocuments({
			sendTo: userId,
			$or: [{ readAt: { $exists: false } }, { readAt: null }],
		});
	}

	async markAsRead(userId: Id, notificationId: Id) {
		const updated = await this.NotifyRepo.findOneAndUpdate({ _id: notificationId, sendTo: userId }, { readAt: new Date() })
			.lean()
			.populate<INotificationWSender>({ path: 'sendBy', select: selectGeneralUserInfo })
			.exec();

		if (!updated) throw new NotFoundException('Notification not found', 'markAsRead');
		return updated;
	}

	async markAllAsRead(userId: Id) {
		return await this.NotifyRepo.updateMany({ sendTo: userId }, { readAt: new Date() });
	}

	async deleteNotification(userId: Id, notificationId: Id) {
		const deleted = await this.NotifyRepo.findOneAndDelete({ _id: notificationId, sendTo: userId }).lean().exec();
		if (!deleted) throw new NotFoundException('Notification not found', 'deleteNotification');
		return true;
	}

	async deleteAllNotifications(userId: Id) {
		return await this.NotifyRepo.deleteMany({ sendTo: userId });
	}

	// async blockUser(userId: Id, targetUserId: string): Promise<IBlock> {
	// 		// 1. Prevent self-blocking
	// 		if (userId.toString() === targetUserId.toString()) {
	// 			throw new BadRequestException('You cannot block yourself', 'Block-user');
	// 		}

	// 		// 2. check if target user exists and not blocked current user
	// 		const [targetUser, isExist] = await Promise.all([
	// 			this.UserRepo.findById(targetUserId).lean().exec(),
	// 			// this.BlockRepo.findOne({ blocker: targetUserId, blocked: userId }).lean().exec(),
	// 			// this.BlockRepo.findOne({ blocker: userId, blocked: targetUserId }).lean().exec(),
	// 			this.BlockRepo.findOne({
	// 				$or: [
	// 					{ blocker: userId, blocked: targetUserId },
	// 					{ blocker: targetUserId, blocked: userId },
	// 				],
	// 			})
	// 				.lean()
	// 				.exec(),
	// 		]);

	// 		if (!targetUser) {
	// 			throw new NotFoundException('User not found', 'Block-user');
	// 		}

	// 		if (isExist) {
	// 			if (isExist.blocked.toString() === userId.toString()) {
	// 				throw new NotFoundException('User not found', 'Block-user');
	// 			}
	// 			// 3. Check if already blocked
	// 			if (isExist.blocker.toString() === userId.toString()) {
	// 				throw new BadRequestException('You have already blocked this user', 'Block-user');
	// 			}
	// 		}

	// 		// 4. delete friend if exists with any status (pending, accepted, rejected)
	// 		const isFriends = await this.FriendRepo.findOneAndDelete({
	// 			$or: [
	// 				{ sendBy: userId, sendTo: targetUserId },
	// 				{ sendBy: targetUserId, sendTo: userId },
	// 			],
	// 		})
	// 			.lean()
	// 			.exec();

	// 		// 5. block user
	// 		const block = await this.BlockRepo.create({
	// 			blocker: userId,
	// 			blocked: targetUserId,
	// 		});

	// 		return block;
	// 	}
	// 	async getBlockedUsers(
	// 		userId: Id,
	// 		{ page, limit, search }: IQueryDTO,
	// 	): Promise<IPaginatedResult<(IBlock & { blocked: IGeneralUser })[]>> {
	// 		const filter: QueryFilter<IBlock> = { blocker: userId };
	// 		if (search && search.trim()) {
	// 			const searchRegex = { $regex: search.trim(), $options: 'i' };
	// 			filter.$or = [{ username: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
	// 		}

	// 		const data = await this.BlockRepo.find(filter)
	// 			.lean<(IBlock & { blocked: IGeneralUser })[]>()
	// 			.populate<IBlock & { blocked: IGeneralUser }>({
	// 				path: 'blocked',
	// 				select: selectGeneralUserInfo,
	// 			})
	// 			.paginate(page, limit)
	// 			.exec();

	// 		return data;
	// 	}

	// 	async unblockUser(userId: Id, targetUserId: string): Promise<boolean> {
	// 		const isExist = await this.BlockRepo.findOneAndDelete({ blocker: userId, blocked: targetUserId }).lean().exec();

	// 		if (!isExist) {
	// 			throw new BadRequestException('You have not blocked this user or user not found', 'Unblock-user');
	// 		}

	// 		return !!isExist;
	// 	}
}

export default new NotificationServices();
