import { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { isDev } from '../config/env.config';
import {
	ConflictException,
	InternalException,
	UnAuthorizedException,
	ValidationErrorsException,
} from '../shared/response/exception.response';
import AppError from '../utils/error-handler/app-error';

const productionMsg = 'Sorry, something went wrong.';

// Strongly typed interface for Mongoose duplicate key error pattern
interface IMongooseDuplicateError extends Error {
	code?: number;
	keyValue?: Record<string, string>;
	cause?: {
		code?: number;
		keyValue?: Record<string, string>;
	};
}

const sendDevelopmentError = (err: AppError, req: Request, res: Response) => {
	res.status(err.statusCode).json({
		success: false,
		message: err.message,
		remainingSeconds: err.remainingSeconds ? err.remainingSeconds : undefined,
		errors: Object.keys(err.errors).length ? err.errors : undefined,
		error: {
			timestamp: new Date().toISOString(),
			path: req.originalUrl,
			name: err.name,
			context: err.context,
			isOperational: err.isOperational,
			stack: err.stack,
			original: err.originalError,
			cause: err.cause,
		},
	});
};

const sendProductionError = (err: AppError, res: Response) => {
	res.status(err.statusCode).json({
		success: false,
		message: err.isOperational ? err.message : productionMsg,
		remainingSeconds: err.remainingSeconds ? err.remainingSeconds : undefined,
		errors: Object.keys(err.errors).length ? err.errors : undefined,
	});
};

// --- Mongoose Error Transformers ---
const handleMongooseCastError = (err: MongooseError.CastError): AppError => {
	const message = `Invalid field value for ${err.path}: ${err.value}`;
	const errors = { [err.path]: `Invalid ${err.kind}` };
	return new ValidationErrorsException({ body: errors }, message, 'MongooseCastError');
};

const handleMongooseDuplicateFields = (err: IMongooseDuplicateError): AppError => {
	const keyValue = err?.cause?.keyValue || err?.keyValue || {};
	const key = Object.keys(keyValue)[0] || 'field';
	const value = keyValue[key] || '';

	const message = `Duplicate field value: ${key} (${value}). Please use another value.`;
	const errors = {
		[key]: `This ${key} is already taken.`,
	};
	return new ConflictException(message, 'db_duplicate_field_value', { body: errors });
};

const handleMongooseValidationError = (err: MongooseError.ValidationError): AppError => {
	const errorsBody: Record<string, string> = {};

	Object.values(err.errors).forEach((el) => {
		const path = (el as any)?.properties?.path || el.path;
		errorsBody[path] = el.message;
	});

	const message = `Database validation failed. Please check your information.`;
	return new ValidationErrorsException({ body: errorsBody }, message, 'database_validation_error');
};

// --- JWT Error Transformers ---
const handleJWTError = (originalErr: Error): AppError =>
	new UnAuthorizedException('Invalid token. Please log in again!', 'jwt_invalid_token');

const handleJWTExpiredError = (originalErr: Error): AppError =>
	new UnAuthorizedException('Your session has expired! Please log in again.', 'jwt_expired_token');

// --- Global Error Handler Middleware ---
export const globalErrorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
	let error: AppError;

	const errObject = err as Error & { code?: number; cause?: { code?: number } };

	// Normalizing and wrapping errors while retaining source stack traces
	if (errObject?.name === 'CastError') {
		error = handleMongooseCastError(err as MongooseError.CastError);
	} else if (errObject?.code === 11000 || errObject?.cause?.code === 11000) {
		error = handleMongooseDuplicateFields(err as IMongooseDuplicateError);
	} else if (errObject?.name === 'ValidationError' && !(err instanceof AppError)) {
		error = handleMongooseValidationError(err as MongooseError.ValidationError);
	} else if (errObject?.name === 'JsonWebTokenError') {
		error = handleJWTError(errObject);
	} else if (errObject?.name === 'TokenExpiredError') {
		error = handleJWTExpiredError(errObject);
	} else if (err instanceof AppError) {
		error = err;
	} else {
		const fallbackMessage = errObject?.message || productionMsg;
		error = new InternalException(fallbackMessage, 'unhandled_error', 500, err);
	}

	// Handle rate limiting headers if applicable
	if (error.statusCode === 429 && error.remainingSeconds) {
		res.setHeader('Retry-After', error.remainingSeconds);
	}

	// Express response execution based on environment
	if (isDev) {
		sendDevelopmentError(error, req, res);
	} else {
		sendProductionError(error, res);
	}
};
