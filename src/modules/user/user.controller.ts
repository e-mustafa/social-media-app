import { Request, Response } from 'express';
import { UnAuthorizedException } from '../../shared/response/exception.response';
import { successResponse } from '../../shared/response/success.response';
import { Id, IFile } from '../../shared/types/validation.type';
import { IParamsIdDTO, IQueryDTO } from '../../shared/validation/general-fields.validation';
import services from './user.service';

export async function getMyProfile(req: Request, res: Response) {
	const user = req.user;
	if (!user) {
		throw new UnAuthorizedException('Unauthenticated, please login.', 'Get-my-profile');
	}
	successResponse({ res, data: user });
}

export async function updateProfile(req: Request, res: Response) {
	const data = await services.updateProfile(req.user._id, req.body || {});
	successResponse({ res, data });
}

export async function uploadUserPic(req: Request, res: Response) {
	const uFile: IFile = Object.values(req.file || {})[0];
	const data = await services.uploadUserPic(req.user._id, uFile as IFile);
	successResponse({ res, message: `${uFile.fieldname} uploaded successfully`, data });
}

export function deleteUserPic(fieldname: 'avatar' | 'cover') {
	return async (req: Request, res: Response) => {
		const data = await services.deleteUserPic(req.user, fieldname);
		successResponse({ res, message: `${fieldname} uploaded successfully`, data });
	};
}

// Block -------------------------------------------------
// export async function getBlockUsers(req: Request, res: Response) {
// 	const { data, metadata } = await services.getBlockUsers(req.user._id, req.query as unknown as IQueryDTO);
// 	successResponse({ res, metadata, data });
// }

// export async function blockUser(req: Request, res: Response) {
// 	const data = await services.blockUser(req.user._id, req.params.userId as string);
// 	successResponse({ res, message: 'User blocked successfully', data });
// }

// export async function unblockUser(req: Request, res: Response) {
// 	const data = await services.unblockUser(req.user._id, req.params.userId as string);
// 	successResponse({ res, message: 'User unblocked successfully', data });
// }

export async function getUser(req: Request, res: Response) {
	const data = await services.getUser(req.params.userId as IParamsIdDTO['id'], req.user._id);
	successResponse({ res, data });
}

export async function getUsers(req: Request, res: Response) {
	const { user, query } = req || {};
	console.log('query', query);

	const { data, metadata } = await services.getUsers(user._id as Id, query as unknown as IQueryDTO);
	successResponse({ res, metadata, data });
}

// export async function getMyFriends(req: Request, res: Response) {
// 	const { user, query } = req || {};
// 	const { data, metadata } = await services.getMyFriends(user._id as Id, query as unknown as IQueryDTO);
// 	successResponse({ res, metadata, data });
// }

// export async function removeFriend(req: Request, res: Response) {
// 	const data = await services.removeFriend(req.user._id as Id, req.params.userId as Id);
// 	successResponse({ res, message: 'Account activated successfully', data });
// }
