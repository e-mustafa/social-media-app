import { Request, Response } from 'express';
import { successResponse } from '../../shared/response/success.response';
import { Id, IFile, IUserBody } from '../../shared/types';
import { IQueryDTO } from '../../shared/validation/general-fields.validation';
import services from './chat.service';
import { ICreateGroupDTO, IGetChatMessagesQueryDTO } from './chat.validation';

export async function getChatList(req: Request, res: Response) {
	const { data, metadata } = await services.getChatList(req.user?._id as Id, req.query as unknown as IQueryDTO);
	successResponse({ res, metadata, data });
}

export async function getChatMessageList(req: Request, res: Response) {
	const { data, metadata } = await services.getChatMessageList(
		req.user?._id as Id,
		req.params.chatId as string,
		req.query as unknown as IGetChatMessagesQueryDTO,
	);
	successResponse({ res, metadata, data });
}

export async function createGroup(req: Request, res: Response) {
	const { user, body, file } = req || {};
	await services.createGroup(user as IUserBody, body as ICreateGroupDTO, file as IFile);
	successResponse({ res, message: 'Group created successfully' });
}
