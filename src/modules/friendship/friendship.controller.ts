import { Request, Response } from 'express';
import { successResponse } from '../../utils/response/success.response';
import { Id } from '../../utils/types/shared.type';
import { IQueryDTO } from '../../utils/validation/general-fields.validation';
import services from './friendship.service';

export async function getReceivedRequests(req: Request, res: Response) {
	const { data, metadata } = await services.getReceivedRequests(req.user._id as Id, req.query as unknown as IQueryDTO);
	successResponse({ res, metadata, data });
}

export async function getSentRequests(req: Request, res: Response) {
	const { data, metadata } = await services.getSentRequests(req.user._id as Id, req.query as unknown as IQueryDTO);
	successResponse({ res, metadata, data });
}

export async function sendFriendRequest(req: Request, res: Response) {
	const { user, params } = req || {};
	await services.sendFriendRequest(user._id as Id, params.id as Id);
	successResponse({ res, message: 'Friend request sent successfully' });
}

export async function deleteFriendRequest(req: Request, res: Response) {
	const { user, params } = req || {};
	await services.deleteFriendRequest(user._id as Id, params.id as Id);
	successResponse({ res, message: 'Friend request deleted successfully' });
}

export async function acceptFriendRequest(req: Request, res: Response) {
	const { user, params } = req || {};
	const data = await services.acceptFriendRequest(user._id as Id, params.id as Id);
	successResponse({ res, message: 'You are Friend now', data });
}

export async function rejectFriendRequest(req: Request, res: Response) {
	const { user, params } = req || {};
	await services.rejectFriendRequest(user._id as Id, params.id as Id);
	successResponse({ res, message: 'Friend request rejected' });
}

