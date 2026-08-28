import { BaseRepository } from '../../DB/base.repository';
import { NotFoundException } from '../../shared/response/exception.response';
import { Id } from '../../shared/types';
import Comment from './comment.model';
import { IComment } from './comment.types';

export class CommentRepository extends BaseRepository<IComment> {
	constructor() {
		super(Comment);
	}

	/**
	 * Validates comment existence and ensures neither the comment author
	 * nor the parent comment author is in the user's block list.
	 */
	async validateCommentAccess(commentId: Id, blockIdsSet: Set<string>): Promise<IComment> {
		const comment = await this.findById(commentId).lean().exec();
		if (!comment) {
			throw new NotFoundException('Comment not found', 'validateCommentAccess');
		}

		// Check block for current comment author
		if (comment.author && blockIdsSet.has(comment.author.toString())) {
			throw new NotFoundException('Comment not found', 'validateCommentAccess');
		}

		// Check block for parent comment author if it is a reply
		if (comment.parentId) {
			const parentComment = await this.findById(comment.parentId).lean().exec();
			if (!parentComment) {
				throw new NotFoundException('Comment not found', 'validateCommentAccess');
			}

			if (parentComment.author && blockIdsSet.has(parentComment.author.toString())) {
				throw new NotFoundException('Comment not found', 'validateCommentAccess');
			}
		}

		return comment;
	}
}

export default new CommentRepository();
