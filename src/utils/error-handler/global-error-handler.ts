import { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { isDev } from '../../config/env.config';
import AppError, { ConflictException, ValidationErrorsException } from './app-error';

const productionMsg = 'Sorry, something went wrong.';

const sendDevelopmentError = (err: AppError, req: Request, res: Response) => {
	res.status(err.statusCode).json({
		success: false,
		message: err.message,
		errors: Object.keys(err.errors).length ? err.errors : undefined,
		error: {
			timestamp: new Date().toISOString(),
			path: req.originalUrl,
			name: err.name,
			context: err.context,
			isOperational: err.isOperational,
			stack: err.stack,
		},
	});
};

const sendProductionError = (err: AppError, res: Response) => {
	res.status(err.statusCode).json({
		success: false,
		message: err.isOperational ? err.message : productionMsg,
		errors: Object.keys(err.errors).length ? err.errors : undefined,
	});
};

// Transformer for invalid MongoDB Object ID errors (e.g., malformed ID)
const handleMongooseCastError = (err: MongooseError.CastError): AppError => {
	const message = `Invalid field value for ${err.path}: ${err.value}`;
	const errors = { [err.path]: `Invalid ${err.kind}` };
	return new ValidationErrorsException({ body: errors }, message, 'MongooseCastError');
};

// Transformer for duplicate database keys (e.g., email already registered)
const handleMongooseDuplicateFields = (err: any): AppError => {
	const keyValue = err?.cause?.keyValue || err?.keyValue || {};
	const key = Object.keys(keyValue)[0] || 'field';
	const value = keyValue[key] || '';

	const message = `Duplicate field value: ${key} (${value}). Please use another value.`;
	const errors = {
		[key]: `This ${key} is already taken.`,
	};
	return new ConflictException(message, 'db_duplicate_field_value', { body: errors });
};

// Transformer for schema validation failures (e.g., age out of bounds)
const handleMongooseValidationError = (err: MongooseError.ValidationError): AppError => {
	const errorsBody: Record<string, string> = {};

	Object.values(err.errors).forEach((el) => {
		const path = (el as any)?.properties?.path || el.path;
		errorsBody[path] = el.message;
	});

	const message = `Database validation failed. Please check your information.`;
	return new ValidationErrorsException({ body: errorsBody }, message, 'database_validation_error');
};

// Type definition accepting any error thrown inside Express
export const globalErrorHandler = (err: Error | AppError | any, req: Request, res: Response, next: NextFunction) => {
	// Normalizing standard unknown errors to AppError baseline
	let error: AppError =
		err instanceof AppError
			? err
			: new AppError(err.statusCode || 500, err.message || productionMsg, 'unhandled_error', {}, false);

	const cause = err?.cause;

	// Check and transform specific Mongoose/MongoDB errors
	if (err.name === 'CastError') error = handleMongooseCastError(err);

	if (err.code === 11000 || cause?.code === 11000) error = handleMongooseDuplicateFields(err);

	if (err.name === 'ValidationError' && !(err instanceof AppError)) error = handleMongooseValidationError(err);

	// Express response execution based on environment
	if (isDev) {
		sendDevelopmentError(error, req, res);
	} else {
		sendProductionError(error, res);
	}
};
