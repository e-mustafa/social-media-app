import { Response } from 'express';

interface ISuccessResponse<T> {
	res: Response;
	message?: string;
	data?: T;
	status?: number;
	[key: string]: any;
}

export const successResponse = <T>({ res, message, data, status = 200, ...rest }: ISuccessResponse<T>) => {
	return res.status(status).json({ success: true, message, ...rest, data });
};
