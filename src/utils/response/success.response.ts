import { Response } from 'express';

export const successResponse = <T>({
	res,
	message,
	data,
	status = 200,
	...rest
}: {
	res: Response;
	message?: string;
	data?: T;
	status?: number;
}) => {
	res.status(status).json({ success: true, message, ...rest, data });
};
