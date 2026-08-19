import { PipelineStage, QueryFilter } from 'mongoose';
import { appConfig } from '../../config/app.config';
import { BaseRepository } from '../../DB/base.repository';
import { sortOrderEnum } from '../../shared/enums/query.enum';
import { NotFoundException } from '../../shared/response/exception.response';
import { Id } from '../../shared/types';
import { blockRepository } from '../block';
import { friendRepository } from '../friend';
import { selectGeneralUserInfo } from '../user';
import { PostVisibilityEnum } from './post.enum';
import Post from './post.model';
import { IPost, IPostWUsers } from './post.types';
import { IGetPostsQueryDTO } from './post.validation';

export class PostRepository extends BaseRepository<IPost> {
	protected activeFilter: QueryFilter<IPost> = {
		isPublished: true,
		// $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
	};

	constructor(private customFilter?: QueryFilter<IPost>) {
		super(Post);
	}

	protected override getDefaultFilter() {
		if (!this.customFilter) return this.activeFilter;
		return { $and: [this.activeFilter, this.customFilter] };
	}

	/**
	 * Retrieves a post by ID while checking publication status, blocks, and visibility permissions.
	 * @param userId
	 * @param postId
	 * @returns post data as IPost
	 */
	async postWValidateAccess(userId: Id, postId: Id): Promise<{ post: IPostWUsers; blockedIds: Id[] }> {
		const blockedIds = await blockRepository.getBlockedUsersIds(userId);
		const post = await this.findById(postId)
			.lean()
			.populate<IPostWUsers>([
				{
					path: 'taggedUsers',
					select: selectGeneralUserInfo,
					match: { _id: { $nin: blockedIds } },
				},
				{ path: 'author', select: selectGeneralUserInfo },
			])
			.exec();

		if (!post) {
			throw new NotFoundException('Post not found', 'getPost');
		}

		const authorId = post.author?._id?.toString() || post.author?.toString();

		// Check block relationship between current user and post author
		const isBlocked = await blockRepository.isBlocked(userId, authorId || '');
		if (isBlocked) {
			throw new NotFoundException('Post not found', 'getPost');
		}

		// Validate permissions for non-author users
		if (authorId !== userId.toString()) {
			// if (!post.isPublished) -> already handled in post repository
			// 	throw new NotFoundException('Post not found', 'getPost');
			// }

			if (post.visibility === PostVisibilityEnum.PRIVATE) {
				throw new NotFoundException('Post not found', 'getPost');
			}

			if (post.visibility === PostVisibilityEnum.FRIENDS) {
				const isFriends = await friendRepository.isFriends(userId, authorId || '');
				if (!isFriends) {
					throw new NotFoundException('Post not found', 'getPost');
				}
			}
		}

		return { post, blockedIds };
	}

	/**
	 * Generates and executes feed aggregation pipeline handling visibility, blocks, and friends
	 */
	async getFeedPaginated(params: IGetPostsQueryDTO & { userId: Id; friendIds: Id[]; blockedIds: Id[] }) {
		const {
			userId,
			friendIds = [],
			blockedIds = [],
			order,
			page = 1,
			limit = appConfig.post.defaultLimit || 10,
			search,
		} = params;

		const skip = (page - 1) * limit;
		const sortOrder = order === sortOrderEnum.ASC ? 1 : -1;

		const matchStage: PipelineStage.Match['$match'] = {
			isPublished: true,
			// Exclude posts from/to blocked users
			author: { $nin: blockedIds },
			$or: [
				// 1. Author can see their own posts regardless of visibility
				{ author: userId },
				// 2. Public posts
				{ visibility: 'public' },
				// 3. Friends visibility: accessible if user is a friend OR tagged in the post
				{
					visibility: 'friends',
					$or: [{ author: { $in: friendIds } }, { taggedUsers: userId }],
				},
			],
		};

		if (search?.trim()) {
			matchStage.content = { $regex: search.trim(), $options: 'i' };
		}

		const pipeline: PipelineStage[] = [
			{ $match: matchStage },
			{ $sort: { createdAt: sortOrder } },
			{
				$facet: {
					data: [
						{ $skip: skip },
						{ $limit: limit },
						{
							$lookup: {
								from: 'users',
								localField: 'author',
								foreignField: '_id',
								as: 'author',
								pipeline: [{ $project: { firstName: 1, lastName: 1, username: 1, bio: 1, gender: 1, avatar: 1 } }],
							},
						},
						{ $unwind: '$author' },
						{
							$lookup: {
								from: 'users',
								let: { taggedIds: '$taggedUsers' },
								pipeline: [
									{
										$match: {
											$expr: {
												$and: [{ $in: ['$_id', '$$taggedIds'] }, { $not: [{ $in: ['$_id', blockedIds] }] }],
											},
										},
									},
									{ $project: { firstName: 1, lastName: 1, username: 1, bio: 1, gender: 1, avatar: 1 } },
								],
								as: 'taggedUsers',
								// $project: { firstName: 1, lastName: 1, username: 1, bio: 1, gender: 1, avatar: 1 },
							},
						},
					],
					totalCount: [{ $count: 'count' }],
				},
			},
		];

		const data = await this.aggregate<{ data: IPostWUsers[]; totalCount: [{ count: number }] }>(pipeline).exec();
		const result = data[0];
		const total: number = result?.totalCount[0]?.count || 0;
		const totalPages = Math.ceil(total / limit);

		console.log('data', data);

		return {
			data: result?.data as IPostWUsers[],
			metadata: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
				hasNext: page < totalPages,
				hasPrev: page > 1,
			},
		};

		// const result = await this.Model.aggregate(pipeline).exec();
	}
}

export default new PostRepository();
