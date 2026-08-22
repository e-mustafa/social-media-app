import { QueryFilter } from 'mongoose';
import { BadRequestException, NotFoundException } from '../../shared/response/exception.response';
import { IQueryDTO } from '../../shared/validation/general-fields.validation';
import { friendRepository } from '../friend';
import { userRepository } from '../user';
import { selectGeneralUserInfo } from '../user/user.service';
import { IGeneralUser } from '../user/user.types';
import { NotificationPayload } from './notification.types';
import { blockRepository } from '../block';

class NotificationServices {
	constructor(
		private readonly BlockRepo = blockRepository,
		private readonly FriendRepo = friendRepository,
		private readonly UserRepo = userRepository,
	) {}

	private buildData2 = (payload: NotificationPayload) => {
		const data: Record<string, string> = {
			type: payload.type,
			sendBy: payload.sendBy.toString(),
		};
		if (payload.requestId) data.requestId = payload.requestId.toString();
		if (payload.postId) data.postId = payload.postId.toString();
		if (payload.commentId) data.commentId = payload.commentId.toString();
		if (payload.replyId) data.replyId = payload.replyId.toString();
		if (payload.reactionId) data.reactionId = payload.reactionId.toString();
		return data;
	};

	private buildData = (payload: NotificationPayload): Record<string, string> => {
		const data: Record<string, string> = {};
		Object.entries(payload).forEach(([key, value]) => (data[key] = value.toString()));
		return data;
	};


	async sendNotification(payload: NotificationPayload): Promise<void> {
		const { sendBy, sendTo, type, title, body, requestId, postId, commentId, replyId, reactionId } = payload || {};
		try {
			if (sendBy.toString === sendTo.toString) return;
			// check if user exists and active
			const recipient = await userRepository.findById(sendTo).lean().select('notificationEnabled deviceToken').exec();
			if (!recipient) return;
	
			// check if user is blocked
			if (await this.BlockRepo.isBlocked(sendBy, sendTo)) return;
	
			await 
		} catch (error) {}
	};
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
