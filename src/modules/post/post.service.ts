import { QueryFilter, Types } from 'mongoose';
import { isDev } from '../../config/env.config';
import { sortOrderEnum } from '../../shared/enums/query.enum';
import { BadRequestException, NotFoundException } from '../../shared/response/exception.response';
import { Id, IFile, IPaginatedResult, TAttachment } from '../../shared/types';
import { deleteMultipleFromCloudinary, uploadPostAttachments } from '../../utils/upload-files/cloudinary';
import blockRepository, { BlockRepository } from '../block/block.repository';
import { commentServices } from '../comment';
import commentRepository from '../comment/comment.repository';
import { friendRepository } from '../friend';
import { FriendRepository } from '../friend/friend.repository';
import { reactionRepository, reactionServices } from '../reaction';
import { selectGeneralUserInfo } from '../user';
import userRepository, { UserRepository } from '../user/user.repository';
import { PostVisibilityEnum, TPostVisibility } from './post.enum';
import postRepository, { PostRepository } from './post.repository';
import { IPost, IPostWTaggedUsers, IPostWUsers } from './post.types';
import { ICreatePostDTO, IGetPostsQueryDTO, IUpdatePostDTO } from './post.validation';

class PostServices {
	constructor(
		private readonly PostRepo: PostRepository = postRepository,
		private readonly BlockRepo: BlockRepository = blockRepository,
		private readonly FriendRepo: FriendRepository = friendRepository,
		private readonly UserRepo: UserRepository = userRepository,
		private readonly CommentRepo = commentRepository,
		private readonly ReactionRepo = reactionRepository,
	) {}

	async getMyPosts(
		userId: Id,
		isDraft: boolean = false,
		query: IGetPostsQueryDTO,
	): Promise<IPaginatedResult<IPostWTaggedUsers>> {
		const { page = 1, limit = 10, order = sortOrderEnum.DESC, search } = query || {};

		const filter: QueryFilter<IPost> = {
			author: userId,
			isPublished: !isDraft,
		};

		if (search?.trim()) {
			filter.content = { $regex: search.trim(), $options: 'i' };
		}

		const blockedIds = await this.BlockRepo.getBlockedUsersIds(userId);

		const posts = await this.PostRepo.find(filter, { ignoreDefaultFilters: isDraft })
			.lean()
			.sort({ createdAt: order === sortOrderEnum.ASC ? 1 : -1 })
			.paginate(page, limit)
			.populate<IPostWUsers>([
				{
					path: 'taggedUsers',
					select: selectGeneralUserInfo,
					match: { _id: { $nin: blockedIds } },
				},
				{
					path: 'author',
					select: selectGeneralUserInfo,
				},
			])
			.exec();

		return posts; // as unknown as IPaginatedResult<IPostWTaggedUsers>;
	}

	async getFeeds(userId: Id, query: IGetPostsQueryDTO): Promise<IPaginatedResult<IPostWTaggedUsers[]>> {
		const { page = 1, limit = 10, order = sortOrderEnum.DESC, search } = query || {};

		const [friendIds, blockedIds] = await Promise.all([
			this.FriendRepo.getFriendIds(userId),
			this.BlockRepo.getBlockedUsersIds(userId),
		]);

		return await this.PostRepo.getFeedPaginated({
			userId,
			friendIds,
			blockedIds,
			page,
			limit,
			search,
			order,
		});
	}

	async getSomeUserPosts(userId: Id, authorId: Id, query: IGetPostsQueryDTO): Promise<IPaginatedResult<IPostWUsers>> {
		const { page = 1, limit = 10, order = sortOrderEnum.DESC, search } = query || {};

		const [user, blockedIds, isFriends] = await Promise.all([
			this.UserRepo.findById(authorId).lean().exec(),
			this.BlockRepo.getBlockedUsersIds(userId),
			this.FriendRepo.isFriends(userId, authorId),
		]);

		if (!user || blockedIds.some((id) => id.toString() === authorId.toString())) {
			throw new NotFoundException('User not found', 'postService.getSomeUserPosts');
		}

		const allowedVisibilities: TPostVisibility[] = [PostVisibilityEnum.PUBLIC];
		if (isFriends || userId.toString() === authorId.toString()) {
			allowedVisibilities.push(PostVisibilityEnum.FRIENDS);
		}

		const filter: QueryFilter<IPost> = {
			author: authorId,
			visibility: { $in: allowedVisibilities },
			isPublished: true,
		};

		if (search?.trim()) {
			filter.content = { $regex: search.trim(), $options: 'i' };
		}

		const posts = await this.PostRepo.find(filter)
			.lean()
			.sort({ createdAt: order === sortOrderEnum.ASC ? 1 : -1 })
			.paginate(page, limit)
			.populate<IPostWUsers>([
				{
					path: 'taggedUsers',
					select: selectGeneralUserInfo,
					match: { _id: { $nin: blockedIds } },
				},
				{
					path: 'author',
					select: selectGeneralUserInfo,
				},
			])
			.exec();

		return posts;
	}

	/**
	 * Retrieves a post by ID while checking publication status, blocks, and visibility permissions.
	 */
	async getPost(userId: Id, postId: string): Promise<IPostWUsers> {
		const { post } = await this.PostRepo.postWValidateAccess(userId, postId);
		return post;
	}

	async createPost(userId: Id, body: ICreatePostDTO, files: IFile[]) {
		const { content, isPublished, visibility, taggedUsers } = body;

		// 1. Convert all tagged user IDs to string and remove duplicates
		const taggedUsersSet = Array.from(new Set(taggedUsers?.map((id) => id.toString()) || []));
		const userIdStr = userId.toString();

		// 2. Prevent self-tagging with correct string interpolation
		if (taggedUsersSet && taggedUsersSet.length) {
			const myId = taggedUsersSet?.find((id) => id === userIdStr);
			if (myId)
				throw new BadRequestException(
					`You cannot tag yourself${isDev ? `: ${userIdStr}` : ''}`,
					'postService.createPost',
				);
		}

		// 3. Fetch all blocked user IDs (both directions: blocked by me or blocked me)
		const blockedIds = await this.BlockRepo.getBlockedUsersIds(userId);
		const blockedIdsSet = new Set(blockedIds?.map((id) => id.toString()) || []);
		// 4. Filter out blocked users from taggedUsers
		const validTaggedUsers = taggedUsersSet.filter((id) => !blockedIdsSet.has(id));

		const postId = new Types.ObjectId();
		let attachments: TAttachment[] = [];

		try {
			// 5. upload attachments
			if (files && files?.length > 0) {
				const uploadResults = await uploadPostAttachments(files, userId, postId.toString());
				attachments = uploadResults?.map((file) => ({
					id: file.id,
					url: file.url,
					resourceType: file.resourceType,
				}));
			}

			// 6. create post in db
			const post = await this.PostRepo.create({
				_id: postId,
				content,
				author: userId,
				attachments,
				isPublished,
				visibility,
				taggedUsers: validTaggedUsers || [],
			});
			// TODO: Trigger async background notifications for validTaggedUsers

			return post;
		} catch (error) {
			if (attachments.length > 0) await deleteMultipleFromCloudinary(attachments);

			throw error;
		}
	}

	async updatePost(userId: Id, postId: Id, body: IUpdatePostDTO, files: IFile[]) {
		const { content, isPublished, visibility, taggedUsers, removedAttachmentIds } = body || {};

		const post = await this.PostRepo.findOne({ _id: postId, author: userId }).lean().exec();
		if (!post) {
			throw new NotFoundException(
				'Post not found or you are not authorized to update this post.',
				'postService.updatePost',
			);
		}

		// 1. Sanitize taggedUsers if provided in update payload
		let validTaggedUsers: string[] | undefined = undefined;
		if (taggedUsers !== undefined) {
			const taggedUsersSet = Array.from(new Set(taggedUsers.map((id) => id.toString())));
			const userIdStr = userId.toString();

			if (taggedUsersSet.includes(userIdStr)) {
				throw new BadRequestException(
					`You cannot tag yourself${isDev ? `: ${userIdStr}` : ''}`,
					'postService.updatePost',
				);
			}

			const blockedIds = await this.BlockRepo.getBlockedUsersIds(userId);
			const blockedIdsSet = new Set(blockedIds?.map((id) => id.toString()) || []);
			validTaggedUsers = taggedUsersSet.filter((id) => !blockedIdsSet.has(id));
		}

		let newFiles: TAttachment[] = [];

		try {
			// 2. Process new file uploads if provided
			if (files && files.length > 0) {
				const uploadResults = await uploadPostAttachments(files, userId, postId.toString());
				newFiles =
					uploadResults?.map((file) => ({
						id: file.id,
						url: file.url,
						resourceType: file.resourceType,
					})) || [];
			}

			// 3. Construct updated attachments array safely
			const originalAttachments = post.attachments || [];
			let remainingAttachments = [...originalAttachments];
			let deletingAttachments: TAttachment[] = [];

			if (removedAttachmentIds && removedAttachmentIds.length > 0) {
				const removedIdsSet = new Set(removedAttachmentIds.map((id) => id.toString()));

				// Extract attachments to delete from the ORIGINAL array
				deletingAttachments = originalAttachments.filter((att) => removedIdsSet.has(att.id.toString()));

				// Keep remaining attachments
				remainingAttachments = originalAttachments.filter((att) => !removedIdsSet.has(att.id.toString()));
			}

			// Merge remaining attachments with newly uploaded ones
			const finalAttachments = [...remainingAttachments, ...newFiles];

			// 4. Update the post in DB safely using defined values only
			const updatedPost = await this.PostRepo.findOneAndUpdate(
				{ _id: postId, author: userId },
				{
					$set: {
						...(content !== undefined && { content }),
						...(isPublished !== undefined && { isPublished }),
						...(visibility !== undefined && { visibility }),
						...(validTaggedUsers !== undefined && { taggedUsers: validTaggedUsers }),
						attachments: finalAttachments,
					},
				},
			)
				.lean()
				.exec();

			// 5. Clean up removed attachments from Cloudinary AFTER successful DB update
			if (deletingAttachments.length > 0) {
				await deleteMultipleFromCloudinary(deletingAttachments);
			}

			return updatedPost;
		} catch (error) {
			// Rollback: Delete newly uploaded files from Cloudinary if DB operation fails
			if (newFiles.length > 0) {
				await deleteMultipleFromCloudinary(newFiles);
			}
			throw error;
		}
	}

	async deletePost(userId: Id, postId: Id) {
		// 1. Find post first to retrieve attachments for Cloudinary cleanup
		const post = await this.PostRepo.findOne({ _id: postId, author: userId }).lean().exec();
		if (!post) {
			throw new NotFoundException(
				'Post not found or you are not authorized to delete this post',
				'postService.deletePost',
			);
		}

		// 2. Delete post document from DB
		const deleted = await this.PostRepo.deleteOne({ _id: postId, author: userId });
		if (!deleted.success) {
			throw new NotFoundException(
				'Post not found or you are not authorized to delete this post',
				'postService.deletePost',
			);
		}

		// 3. Delete associated Cloudinary media files after DB deletion
		if (post.attachments && post.attachments.length > 0) {
			await deleteMultipleFromCloudinary(post.attachments);
		}

		// 4. Cascading cleanup for related documents
		// Delete all comments, replies, and attachments
		const commentIds = await commentServices.deleteAllCommentsByPostId(postId);

		// Delete all reactions associated with the post
		await reactionServices.deletePostAndCommentsReactions(postId, commentIds);

		return true;
	}
}

export default new PostServices();
