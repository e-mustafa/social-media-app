import { Request, Response } from 'express';
import { successResponse } from '../../utils/response/success.response';
import services from './auth.service';

export const register = async (req: Request, res: Response) => {
	await services.register(req.body || {});
	successResponse({ res, message: 'Your account created successfully, please verify your account' });
};
