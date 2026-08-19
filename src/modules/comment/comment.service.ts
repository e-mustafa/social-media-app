import { Types } from 'mongoose';
import { NotFoundException, UnAuthorizedException } from '../../shared/response/exception.response';
import { Id, IFile, IPaginatedResult, TAttachment } from '../../shared/types';
import { IQueryDTO } from '../../shared/validation/general-fields.validation';
import { deleteMultipleFromCloudinary, uploadCommentAttachments } from '../../utils/upload-files/cloudinary';
import { blockRepository } from '../block';
import { friendRepository } from '../friend';
import { IPost, IPostWUsers, postRepository } from '../post';
import { reactionRepository } from '../reaction';
import { TargetTypeEnum } from '../reaction/reaction.enum';
import { userRepository } from '../user';
import { selectGeneralUserInfo } from '../user/user.service';
import commentRepository from './comment.repository';
import { IComment, ICommentWAuthor } from './comment.types';
import { ICreateCommentDTO, ICreateReplyDTO, IUpdateCommentDTO } from './comment.validation';

type createCommentOrReplyProps = {
	userId: Id;
	post: IPost;
	parentComment: IComment | null;
	body: ICreateReplyDTO;
	files: IFile[];
};

class CommentServices {
	constructor(
		private readonly CommentRepo = commentRepository,
		private readonly BlockRepo = blockRepository,
		private readonly PostRepo = postRepository,
		private readonly ReactionRepo = reactionRepository,
		private readonly UserRepo = userRepository,
		private readonly FriendRepo = friendRepository,
	) {}

	/**
	 * Private helper method executing the shared infrastructure logic for both comments and replies.
	 * DO NOT call this directly from controllers.
	 */
	private async _executeCommentCreation({
		userId,
		post,
		parentComment,
		body,
		files,
	}: createCommentOrReplyProps): Promise<IComment> {
		const { content, taggedUsers } = body || {};
		const commentId = new Types.ObjectId();
		let attachments: TAttachment[] = [];

		const postId = post._id.toString();
		const userIdStr = userId.toString();
		const parentId = parentComment?._id.toString() || null;

		// 1. Upload attachments to Cloudinary if files exist
		if (files && files.length) {
			const uploadedFiles = await uploadCommentAttachments(files, userIdStr, postId, commentId.toString());
			attachments =
				uploadedFiles?.map((file) => ({
					id: file.id,
					url: file.url,
					resourceType: file.resourceType,
				})) || [];
		}

		// 2. Create comment or reply document in database
		const comment = await this.CommentRepo.create({
			_id: commentId,
			content,
			parentId: parentId,
			author: userId,
			postId,
			attachments,
			taggedUsers: taggedUsers || [],
		});

		// 3. Update parent entities counters concurrently
		const updateOperations: Promise<unknown>[] = [
			this.PostRepo.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } }),
		];

		if (parentId) {
			updateOperations.push(this.CommentRepo.updateOne({ _id: parentId }, { $inc: { repliesCount: 1 } }));
		}

		await Promise.all(updateOperations);

		// 4. Handle notifications dispatch logic
		if (!parentId && userIdStr !== post.author.toString()) {
			// todo: send notification to post author
		}

		if (parentId && parentComment && userIdStr !== parentComment.author.toString()) {
			// todo: send notification to parent comment author
		}

		if (taggedUsers?.length) {
			// todo: send tag in post notification
		}

		return comment;
	}

	/**
	 * Creates a top-level comment on a post.
	 */
	async createComment(userId: Id, postId: string, body: ICreateCommentDTO, files: IFile[]): Promise<IComment> {
		// 1. Verify post access permissions
		const { post, blockedIds } = await this.PostRepo.postWValidateAccess(userId, postId);

		if (!post) {
			throw new NotFoundException('Post not found', 'CommentServices.createComment');
		}

		// 2. Prevent self-tagging and filter out blocked users from taggedUsers
		const taggedUsersSet = Array.from(new Set(body?.taggedUsers?.map((id) => id.toString()) || []));
		const userIdStr = userId.toString();

		const blockedIdsSet = new Set(blockedIds?.map((id) => id.toString()) || []);
		// Filter out blocked users from taggedUsers
		const validTaggedUsers = taggedUsersSet.filter((id) => !blockedIdsSet.has(id) || id === userIdStr);

		// assign filtered tagged users
		body.taggedUsers = validTaggedUsers;

		// 3. Delegate to shared creation logic with no parent comment
		return this._executeCommentCreation({ userId, post, parentComment: null, body, files });
	}

	/**
	 * Creates a reply to an existing comment.
	 */
	async createReply(userId: Id, parentId: string, body: ICreateReplyDTO, files: IFile[]): Promise<IComment> {
		// 1. Convert all tagged user IDs to string and remove duplicates
		const taggedUsersSet = Array.from(new Set(body?.taggedUsers?.map((id) => id.toString()) || []));
		const userIdStr = userId.toString();

		// 3. Fetch all blocked user IDs (both directions: blocked by me or blocked me)
		const blockedIds = await this.BlockRepo.getBlockedUsersIds(userId);
		const blockedIdsSet = new Set(blockedIds?.map((id) => id.toString()) || []);
		// 4. Filter out blocked users from taggedUsers
		const validTaggedUsers = taggedUsersSet.filter((id) => !blockedIdsSet.has(id) || id === userIdStr);

		// assign filtered tagged users
		body.taggedUsers = validTaggedUsers;

		const parentComment = await this.CommentRepo.findOne({
			_id: parentId,
			author: { $nin: blockedIds || [] },
		})
			.lean()
			.exec();

		if (!parentComment) {
			throw new NotFoundException('Parent comment not found', 'CommentServices.createReply');
		}

		// 3. Validate post access using the parent comment's postId
		const { post } = await this.PostRepo.postWValidateAccess(userId, parentComment.postId.toString());
		if (!post) {
			throw new NotFoundException('Post not found', 'CommentServices.createReply');
		}

		// 3. Delegate to shared creation logic
		return this._executeCommentCreation({ userId, post, parentComment, body, files });
	}

	/**
	 * Updates an existing comment or reply document (content, media, tags).
	 */
	async updateComment(userId: Id, commentId: string, body: IUpdateCommentDTO, files: IFile[]): Promise<IComment> {
		const { content, taggedUsers, removedAttachmentIds } = body || {};

		// 1. Validate comment existence and user ownership
		const comment = await this.CommentRepo.findById(commentId).lean().exec();
		if (!comment) {
			throw new NotFoundException('Comment not found', 'CommentServices.updateComment');
		}

		if (comment.author.toString() !== userId.toString()) {
			throw new UnAuthorizedException('You are not authorized to update this comment', 'CommentServices.updateComment');
		}

		let deletingAttachments: Pick<TAttachment, 'id' | 'resourceType'>[] = [];
		let newAttachments: TAttachment[] = [];

		try {
			// 2. Upload new media files if provided
			if (files && files.length) {
				const uploadedFiles = await uploadCommentAttachments(
					files,
					userId.toString(),
					comment.postId.toString(),
					commentId.toString(),
				);
				newAttachments =
					uploadedFiles?.map((file) => ({
						id: file.id,
						url: file.url,
						resourceType: file.resourceType,
					})) || [];
			}

			let updatedAttachments: TAttachment[] = comment.attachments || [];

			// 3. Process removed attachments safely
			if (removedAttachmentIds && removedAttachmentIds.length > 0) {
				const removedIdsSet = new Set(removedAttachmentIds.map((id) => id.toString()));
				deletingAttachments = updatedAttachments.filter((file) => removedIdsSet.has(file.id.toString()));
				updatedAttachments = updatedAttachments.filter((file) => !removedIdsSet.has(file.id.toString()));
			}

			updatedAttachments = [...updatedAttachments, ...newAttachments];

			// 4. Update comment document in database and return the updated version
			const updatedComment = await this.CommentRepo.findOneAndUpdate(
				{ _id: commentId },
				{ content, attachments: updatedAttachments, taggedUsers: taggedUsers || [] },
			)
				.lean()
				.exec();

			if (!updatedComment) {
				throw new NotFoundException('Comment not found during update', 'CommentServices.updateComment');
			}

			// 5. Delete removed attachments from Cloudinary
			if (deletingAttachments && deletingAttachments.length > 0) {
				await deleteMultipleFromCloudinary(deletingAttachments);
			}

			// todo: send tag in post notification - update comment

			return updatedComment;
		} catch (error) {
			// Rollback: Delete uploaded files from Cloudinary on failure
			if (newAttachments.length > 0) {
				await deleteMultipleFromCloudinary(newAttachments);
			}
			throw error;
		}
	}

	/**
	 * Deletes a single comment or reply along with all child replies, reactions, and Cloudinary attachments.
	 */
	async deleteComment(userId: Id, commentId: Id): Promise<boolean> {
		// 1. Fetch target comment
		const comment = await this.CommentRepo.findOne({ _id: commentId }).lean().exec();
		if (!comment) {
			throw new NotFoundException('Comment not found', 'CommentServices.deleteComment');
		}

		// 2. Fetch parent post to authorize both comment author AND post author
		const post = await this.PostRepo.findOne({ _id: comment.postId }).lean().exec();
		const isCommentAuthor = comment.author.toString() === userId.toString();
		const isPostAuthor = post?.author.toString() === userId.toString();

		if (!isCommentAuthor && !isPostAuthor) {
			throw new UnAuthorizedException('You are not authorized to delete this comment', 'CommentServices.deleteComment');
		}

		// 3. Find child replies to gather all attachment IDs and target IDs for reaction deletion
		const replies = await this.CommentRepo.find({ parentId: commentId }).lean().exec();

		const commentAttachments: TAttachment[] = comment.attachments || [];
		const repliesAttachments = replies ? replies.flatMap((reply) => reply.attachments || []) : [];
		const allAttachments = [...commentAttachments, ...repliesAttachments];

		const allDeletedIds = [commentId, ...replies.map((r) => r._id)];
		const commentsCountToDecrement = 1 + replies.length;

		// 4. Prepare concurrent database cleanup operations
		const dbOperations: Promise<unknown>[] = [
			// Delete main comment document
			this.CommentRepo.deleteOne({ _id: commentId }),

			// Wipe associated reactions for the comment and its child replies
			this.ReactionRepo.deleteMany({ targetId: { $in: allDeletedIds }, targetType: TargetTypeEnum.COMMENT }),
		];

		// Delete child replies if present
		if (replies.length > 0) {
			dbOperations.push(this.CommentRepo.deleteMany({ parentId: commentId }));
		}

		// Decrement parent comment repliesCount if deleted entity is a reply
		if (comment.parentId) {
			dbOperations.push(this.CommentRepo.updateOne({ _id: comment.parentId }, { $inc: { repliesCount: -1 } }));
		}

		// Decrement post commentsCount
		dbOperations.push(
			this.PostRepo.updateOne({ _id: comment.postId }, { $inc: { commentsCount: -commentsCountToDecrement } }),
		);

		// 5. Execute all database updates concurrently
		await Promise.all(dbOperations);

		// 6. Clean up associated media files safely without throwing on CDN issues
		if (allAttachments.length > 0) {
			try {
				await deleteMultipleFromCloudinary(allAttachments.map((e) => ({ id: e.id, resourceType: e.resourceType })));
			} catch (error) {
				console.error('Failed to cleanup comment attachments from Cloudinary:', error);
			}
		}

		return true;
	}

	/**
	 * Retrieves paginated top-level comments for a post, excluding comments from blocked users.
	 */
	async getPostComments(userId: Id, postId: Id, { page, limit }: IQueryDTO): Promise<IPaginatedResult<ICommentWAuthor>> {
		// 1. Verify post access permissions
		const post = await this.PostRepo.postWValidateAccess(userId, postId);
		if (!post) {
			throw new NotFoundException('Post not found', 'CommentServices.getPostComments');
		}

		// 2. Fetch blocked user IDs and execute paginated query
		const blockedIds = await this.BlockRepo.getBlockedUsersIds(userId);

		const comments = await this.CommentRepo.find({
			postId,
			author: { $nin: blockedIds || [] },
			parentId: null,
		})
			.sort({ createdAt: -1 })
			.populate<ICommentWAuthor>({ path: 'author', select: selectGeneralUserInfo })
			.paginate(page, limit)
			.exec();

		return comments;
	}

	/**
	 * Retrieves paginated replies for a specific parent comment.
	 */
	async getCommentReplies(userId: Id, commentId: Id, { page, limit }: IQueryDTO): Promise<IPaginatedResult<IPostWUsers>> {
		// 1. Fetch parent comment first to ensure existence and acquire postId
		const blockedIds = await this.BlockRepo.getBlockedUsersIds(userId);

		const parentComment = await this.CommentRepo.findOne({
			_id: commentId,
			author: { $nin: blockedIds || [] },
		})
			.lean()
			.exec();

		if (!parentComment) {
			throw new NotFoundException('Parent comment not found', 'CommentServices.getCommentReplies');
		}

		// 2. Verify post access permissions using parent comment's postId
		const { post } = await this.PostRepo.postWValidateAccess(userId, parentComment.postId.toString());
		if (!post) {
			throw new NotFoundException('Post not found', 'CommentServices.getCommentReplies');
		}

		// 3. Fetch replies with pagination excluding those from blocked users
		const comments = await this.CommentRepo.find({
			parentId: commentId,
			author: { $nin: blockedIds || [] },
		})
			.sort({ createdAt: 1 })
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
			.paginate(page, limit)
			.exec();

		return comments;
	}

	/**
	 * Bulk cleans up all comments, replies, and attachments related to a specific post.
	 * Returns the array of deleted comment IDs for downstream cleanup (e.g. reactions).
	 */
	async deleteAllCommentsByPostId(postId: Id): Promise<Id[]> {
		// 1. Fetch necessary fields only (_id and attachments)
		const comments = await this.CommentRepo.find({ postId }).select('_id attachments').lean().exec();

		if (!comments || comments.length === 0) {
			return [];
		}

		const commentIds = comments.map((c) => c._id);
		const allAttachments = comments.flatMap((c) => c.attachments || []);

		// 2. Delete comment documents
		await this.CommentRepo.deleteMany({ postId });

		// 3. Clean up Cloudinary storage asynchronously
		if (allAttachments.length > 0) {
			try {
				await deleteMultipleFromCloudinary(allAttachments.map((e) => ({ id: e.id, resourceType: e.resourceType })));
			} catch (error) {
				console.error('Failed to cleanup post comments attachments from Cloudinary:', error);
			}
		}

		// Return gathered IDs to the orchestrator without any extra DB query
		return commentIds;
	}
}

export default new CommentServices();
