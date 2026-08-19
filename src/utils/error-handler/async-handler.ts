import { NextFunction, Request, Response } from 'express';

const asyncHandler = (fn: Function) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await fn(req, res, next);
		} catch (error) {
			next(error);
		}
	};
};

// const asyncHandler = (fn) => (req, res, next) => {
// 	Promise.resolve(fn(req, res, next)).catch(next);
// };

// const asyncHandler = (fn) => {
// 	return async (req, res, next) => {
// 		fn(req, res, next).catch(next);
// 	};
// };

export default asyncHandler;
