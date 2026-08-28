import { Request, Response } from 'express';
import { successResponse } from '../../shared/response/success.response';
import { Id, IUserBody } from '../../shared/types';
import { IQueryDTO } from '../../shared/validation/general-fields.validation';
import services from './friend.service';

export async function getReceivedRequests(req: Request, res: Response) {
	const { data, metadata } = await services.getReceivedRequests(req.user?._id as Id, req.query as unknown as IQueryDTO);
	successResponse({ res, metadata, data });
}

export async function getSentRequests(req: Request, res: Response) {
	const { data, metadata } = await services.getSentRequests(req.user?._id as Id, req.query as unknown as IQueryDTO);
	successResponse({ res, metadata, data });
}

export async function sendFriendRequest(req: Request, res: Response) {
	const { user, params } = req || {};
	await services.sendFriendRequest(user as IUserBody, params.id as Id);
	successResponse({ res, message: 'Friend request sent successfully' });
}

export async function deleteFriendRequest(req: Request, res: Response) {
	const { user, params } = req || {};
	await services.deleteFriendRequest(user?._id as Id, params.id as Id);
	successResponse({ res, message: 'Friend request deleted successfully' });
}

export async function acceptFriendRequest(req: Request, res: Response) {
	const { user, params } = req || {};
	const data = await services.acceptFriendRequest(user as IUserBody, params.id as Id);
	successResponse({ res, status: 201, message: 'You are Friend now', data });
}

export async function rejectFriendRequest(req: Request, res: Response) {
	const { user, params } = req || {};
	await services.rejectFriendRequest(user?._id as Id, params.id as Id);
	successResponse({ res, message: 'Friend request rejected' });
}

export async function getMyFriends(req: Request, res: Response) {
	const { data, metadata } = await services.getMyFriends(req.user?._id as Id, req.query as unknown as IQueryDTO);
	successResponse({ res, metadata, data });
}
