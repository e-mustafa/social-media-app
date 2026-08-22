import { Request, Response } from 'express';
import { successResponse } from '../../shared/response/success.response';
import { IQueryDTO } from '../../shared/validation/general-fields.validation';
import services from './notification.service';

export async function getBlockUsers(req: Request, res: Response) {
	const { data, metadata } = await services.getBlockedUsers(req.user._id, req.query as unknown as IQueryDTO);
	successResponse({ res, metadata, data });
}

export async function blockUser(req: Request, res: Response) {
	const data = await services.blockUser(req.user._id, req.params.userId as string);
	successResponse({ res, message: 'User blocked successfully', data });
}

export async function unblockUser(req: Request, res: Response) {
	const data = await services.unblockUser(req.user._id, req.params.userId as string);
	successResponse({ res, message: 'User unblocked successfully', data });
}
