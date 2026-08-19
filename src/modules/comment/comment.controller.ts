import { Request, Response } from 'express';
import { successResponse } from '../../shared/response/success.response';
import { Id, IFile } from '../../shared/types';
import { IQueryDTO } from '../../shared/validation/general-fields.validation';
import services from './comment.service';

export async function createComment(req: Request, res: Response) {
	const { user, body, params, files } = req || {};
	const data = await services.createComment(user?._id as Id, params.postId as string, body, files as IFile[]);
	successResponse({ res, status: 201, message: 'Comment created successfully', data });
}

export async function updateComment(req: Request, res: Response) {
	const { user, body, params, files } = req || {};
	const data = await services.updateComment(user?._id as Id, params.commentId as string, body, files as IFile[]);
	successResponse({ res, message: 'Comment updated successfully', data });
}

export async function deleteComment(req: Request, res: Response) {
	const { user, params } = req || {};
	const data = await services.deleteComment(user?._id as Id, params.commentId as string);
	successResponse({ res, message: 'Comment deleted successfully' });
}

export async function getPostComments(req: Request, res: Response) {
	const { user, params, query } = req || {};
	const { data, metadata } = await services.getPostComments(
		user?._id as Id,
		params.postId as string,
		query as unknown as IQueryDTO,
	);
	successResponse({ res, metadata, data });
}

export async function getCommentReplies(req: Request, res: Response) {
	const { user, params, query } = req || {};
	const { data, metadata } = await services.getCommentReplies(
		user?._id as Id,
		params.commentId as string,
		query as unknown as IQueryDTO,
	);
	successResponse({ res, metadata, data });
}

export async function createReply(req: Request, res: Response) {
	const { user, body, params, files } = req || {};
	const data = await services.createReply(user?._id as Id, params.commentId as string, body, files as IFile[]);
	successResponse({ res, status: 201, message: 'Reply created successfully', data });
}

export async function updateReply(req: Request, res: Response) {
	const { user, body, params, files } = req || {};
	const data = await services.updateComment(user?._id as Id, params.replyId as string, body, files as IFile[]);
	successResponse({ res, message: 'Reply updated successfully', data });
}

export async function deleteReply(req: Request, res: Response) {
	const { user, params } = req || {};
	const data = await services.deleteComment(user?._id as Id, params.replyId as string);
	successResponse({ res, message: 'Reply deleted successfully', data });
}
