import { BaseRepository, IQueryOptions } from '../../DB/base.repository';
import { Id } from '../../shared/types';
import { FriendRequestStatusEnum } from './friend.enum';
import Friend from './friend.model';
import { IFriend } from './friend.types';

export class FriendRepository extends BaseRepository<IFriend> {
	constructor() {
		super(Friend);
	}

	/**
	 * Check if a specific user has blocked another user.
	 */
	async isFriends(userId: Id, targetUserId: Id, options?: IQueryOptions): Promise<IFriend | null> {
		return await this.findOne(
			{
				$or: [
					{ sendBy: userId, sendTo: targetUserId },
					{ sendBy: targetUserId, sendTo: userId },
				],
				status: FriendRequestStatusEnum.ACCEPTED,
			},
			options,
		)
			.lean()
			.exec();
	}

	async getFriendsList(userId: Id): Promise<IFriend[]> {
		return await this.find({ $or: [{ sendBy: userId }, { sendTo: userId }], status: FriendRequestStatusEnum.ACCEPTED })
			.lean()
			.exec();
	}

	async getFriendIds(userId: Id): Promise<Id[]> {
		const friends = await this.getFriendsList(userId);
		const userIdStr = userId.toString();
		return friends.map((friend) => (friend.sendTo.toString() === userIdStr ? friend.sendBy : friend.sendTo));
	}
}

export default new FriendRepository();
