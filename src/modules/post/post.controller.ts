import { Request, Response } from 'express';
import { successResponse } from '../../shared/response/success.response';
import { Id, IFile } from '../../shared/types';
import services from './post.service';
import { IGetPostsQueryDTO } from './post.validation';

export function getMyPosts(isDraft = false) {
	return async (req: Request, res: Response) => {
		const { user, query } = req || {};
		const { data, metadata } = await services.getMyPosts(user?._id as Id, isDraft, query as unknown as IGetPostsQueryDTO);
		successResponse({ res, metadata, data });
	};
}

export async function getFeeds(req: Request, res: Response) {
	const { query } = req || {};
	const { data, metadata } = await services.getFeeds(req.user?._id as Id, query as unknown as IGetPostsQueryDTO);
	successResponse({ res, metadata, data });
}

export async function getSomeUserPosts(req: Request, res: Response) {
	const { query } = req || {};
	const { data, metadata } = await services.getSomeUserPosts(
		req.user?._id as Id,
		req.params.userId as string,
		query as unknown as IGetPostsQueryDTO,
	);
	successResponse({ res, metadata, data });
}

export async function createPost(req: Request, res: Response) {
	const { user, body = {}, files = [] } = req || {};
	const data = await services.createPost(user?._id as Id, body, files as IFile[]);
	successResponse({ res, status: 201, message: 'Post created successfully', data });
}

export async function getPost(req: Request, res: Response) {
	const data = await services.getPost(req.user?._id as Id, req.params.postId as string);
	successResponse({ res, data });
}

export async function updatePost(req: Request, res: Response) {
	const { user, params, body = {}, files = [] } = req || {};
	const data = await services.updatePost(user?._id!, params.postId as string, body, files as IFile[]);
	successResponse({ res, message: 'Post updated successfully', data });
}

export async function deletePost(req: Request, res: Response) {
	await services.deletePost(req.user?._id as Id, req.params.postId as string);
	successResponse({ res, message: 'Post deleted successfully' });
}
