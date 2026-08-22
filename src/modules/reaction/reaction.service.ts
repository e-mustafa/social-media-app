import { QueryFilter } from 'mongoose';
import { IDeleteResult } from '../../DB/base.repository';
import { ConflictException, NotFoundException } from '../../shared/response/exception.response';
import { Id, IUserBody } from '../../shared/types';
import notifyEvents from '../../utils/events/notification.events';
import { blockRepository } from '../block';
import commentRepository from '../comment/comment.repository';
import { IComment } from '../comment/comment.types';
import { friendRepository } from '../friend';
import { IPost, postRepository } from '../post';
import { PostVisibilityEnum } from '../post/post.enum';
import { selectGeneralUserInfo, userRepository } from '../user';
import { TargetTypeEnum, TReactionType, TTargetType } from './reaction.enum';
import reactionRepository from './reaction.repository';
import { IPaginatedReaction, IReaction, IReactionWUser } from './reaction.types';
import { IGetReactionsQuery } from './reaction.validation';

type IGetReactionsDTO = {
	userId: Id;
	targetId: string;
	targetType: TTargetType;
	query: IGetReactionsQuery;
};

type IAddReactionDTO = {
	user: IUserBody;
	targetId: string;
	targetType: TTargetType;
	reactionType: TReactionType;
};

class ReactionServices {
	constructor(
		private readonly ReactionRepo = reactionRepository,
		private readonly CommentRepo = commentRepository,
		private readonly BlockRepo = blockRepository,
		private readonly PostRepo = postRepository,
		private readonly FriendRepo = friendRepository,
		private readonly UserRepo = userRepository,
	) {}

	/**
	 * Retrieves paginated reactions for a post or a comment with security and block filtering.
	 */
	async getReactions({
		userId,
		targetId,
		targetType,
		query: { page, limit, reactionType },
	}: IGetReactionsDTO): Promise<IPaginatedReaction<IReactionWUser>> {
		let postId: Id = targetId;

		// 1. Fetch blocked user IDs and build string-based Set for O(1) lookups
		const blockIds = await this.BlockRepo.getBlockedUsersIds(userId);
		const blockIdsSet = new Set(blockIds.map((id) => id.toString()));

		// 2. Resolve parent post ID and validate comment access if target is a comment
		if (targetType === TargetTypeEnum.COMMENT) {
			const comment = await this.CommentRepo.validateCommentAccess(targetId, blockIdsSet);
			postId = comment.postId.toString();
		}

		// 3. Validate post access permissions (publication status, visibility, author block)
		await this.PostRepo.postWValidateAccess(userId, postId);

		// 4. Construct dynamic Mongo query including optional reactionType filter
		const filter: QueryFilter<IReaction> = {
			targetId,
			targetType,
			userId: { $nin: blockIds },
		};

		if (reactionType) filter.reactionType = reactionType;
		// 5. Execute parallel DB operations: fetch paginated reactions AND all distinct available types
		const [reactions, existReactionTypes] = await Promise.all([
			this.ReactionRepo.find(filter)
				.lean()
				.populate<IReactionWUser>({ path: 'userId', select: selectGeneralUserInfo })
				.paginate(page, limit)
				.exec(),
			this.ReactionRepo.distinct<TReactionType>('reactionType', filter),
		]);

		return {
			...reactions,
			// metadata, data,
			existReactionTypes,
		};
	}

	async addReaction({ user, targetId, targetType, reactionType }: IAddReactionDTO): Promise<IReaction> {
		const model: typeof this.PostRepo | typeof this.CommentRepo =
			targetType === TargetTypeEnum.POST ? this.PostRepo : this.CommentRepo;

		// 1. Fetch target document
		// const target = await model.findById(targetId).exec();
		const target: IComment | IPost | null = await model.findById(targetId).lean().exec();
		if (!target) {
			throw new NotFoundException(`${targetType} not found`, 'addReaction');
		}

		// 2. Resolve parent post and validate blocking
		let parentPost: IPost | IComment;
		const targetAuthorId = target.author.toString();
		const userId = user._id.toString();

		// Check block between current user and target author
		const isTargetAuthorBlocked = await this.BlockRepo.isBlocked(userId, targetAuthorId);
		if (isTargetAuthorBlocked) {
			throw new NotFoundException(`${targetType} not found`, 'addReaction');
		}

		if (targetType === TargetTypeEnum.POST) {
			// parentPost = target as HydratedDocument<IPost>;
			parentPost = target as unknown as IPost;
		} else {
			const comment = target as unknown as IComment;
			const foundPost = await this.PostRepo.findById(comment.postId).exec();
			if (!foundPost) {
				throw new NotFoundException('Post not found', 'addReaction');
			}
			parentPost = foundPost;

			// Check block with post author if target is a comment
			const isPostAuthorBlocked = await this.BlockRepo.isBlocked(userId, parentPost.author.toString());
			if (isPostAuthorBlocked) {
				throw new NotFoundException(`${targetType} not found`, 'addReaction');
			}
		}

		// 3. Ensure target post is published
		// if (!parentPost.isPublished) {
		// 	throw new NotFoundException(`${targetType} not found`, 'addReaction');
		// }

		// 4. Check visibility permissions for non-authors
		const postAuthorId = parentPost.author.toString();
		if (postAuthorId !== userId.toString()) {
			if (parentPost.visibility === PostVisibilityEnum.PRIVATE) {
				throw new NotFoundException('Post not found', 'addReaction');
			}

			if (parentPost.visibility === PostVisibilityEnum.FRIENDS) {
				const isFriends = await this.FriendRepo.isFriends(userId, postAuthorId);
				if (!isFriends) {
					throw new NotFoundException('Post not found', 'addReaction');
				}
			}
		}

		// 5. Handle reaction update or creation
		const existingReaction = await this.ReactionRepo.findOne({
			userId,
			targetId,
			targetType,
		}).exec();

		if (existingReaction) {
			if (existingReaction.reactionType === reactionType) {
				throw new ConflictException('Reaction already added', 'addReaction');
			}

			// Changing reaction type does not affect total reactions count
			existingReaction.reactionType = reactionType;
			return await existingReaction.save();
		}

		// 6. Create reaction and update counter atomically
		const reaction = await this.ReactionRepo.create({
			userId,
			targetId,
			targetType,
			reactionType,
		});

		await model
			.findByIdAndUpdate(targetId, {
				$inc: { reactionsCount: 1 },
			})
			.exec();

		// 7. Emit notification event
		notifyEvents.emit(targetType === TargetTypeEnum.POST ? 'post-react' : 'comment-react', {
			to: targetAuthorId,
			sender: user,
			reactionId: reaction._id,
			...(targetType === TargetTypeEnum.POST ? { postId: targetId } : { commentId: targetId }),
			reactionType,
			postId: parentPost._id,
		});

		return reaction;
	}

	async removeReaction(userId: Id, targetId: string, targetType: TTargetType): Promise<IReaction> {
		// remove reaction
		const reaction = await this.ReactionRepo.findOneAndDelete({
			userId,
			targetId,
			targetType,
		}).exec();
		if (!reaction) {
			throw new NotFoundException('You have not Reacted', 'removeReaction');
		}

		// select model based on targetType
		const model: typeof this.PostRepo | typeof this.CommentRepo =
			targetType === TargetTypeEnum.POST ? this.PostRepo : this.CommentRepo;

		// update counter
		await model
			.findByIdAndUpdate(targetId, {
				$inc: { reactionsCount: -1 },
			})
			.exec();

		return reaction;
	}

	/**
	 * Bulk deletes all reactions associated with a post and all of its comments in a single query.
	 */
	async deletePostAndCommentsReactions(postId: Id, commentIds?: Id[]): Promise<IDeleteResult> {
		const deleteConditions: QueryFilter<IReaction>[] = [
			{
				targetId: postId,
				targetType: TargetTypeEnum.POST,
			},
		];

		if (commentIds && commentIds.length) {
			deleteConditions.push({
				targetId: { $in: commentIds },
				targetType: TargetTypeEnum.COMMENT,
			});
		}

		return await this.ReactionRepo.deleteMany({ $or: deleteConditions });
	}
}

export default new ReactionServices();
