import { BaseRepository, IQueryOptions } from '../../DB/base.repository';
import { Id } from '../../shared/types';
import { Block } from './block.model';
import { IBlock } from './block.types';

export class BlockRepository extends BaseRepository<IBlock> {
	constructor() {
		super(Block);
	}

	/**
	 * Check if a specific user has blocked another user.
	 */
	async isBlocked(blockerId: Id, blockedId: Id, options?: IQueryOptions): Promise<IBlock | null> {
		return await this.findOne(
			{
				$or: [
					{ blocker: blockerId, blocked: blockedId },
					{ blocker: blockedId, blocked: blockerId },
				],
			},
			options,
		)
			.select('blocked')
			.lean()
			.exec();
	}

	/**
	 * Retrieve a list of all user IDs blocked by a specific user.
	 */
	async getBlockedUsersIds(userId: Id): Promise<string[]> {
		// const list = await this.find({ blocker: userId }).lean().exec();
		const list = await this.find({ $or: [{ blocker: userId }, { blocked: userId }] })
			.lean()
			.exec();
		const currentId = userId.toString();
		return list.map((item) => {
			return item.blocker.toString() === currentId ? item.blocked.toString() : item.blocker.toString();
		});
	}
}

export default new BlockRepository();
