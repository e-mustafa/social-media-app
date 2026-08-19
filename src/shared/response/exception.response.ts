import AppError from '../../utils/error-handler/app-error';
import { IFieldErrors } from '../types/validation.type';

export class InternalException extends AppError {
	constructor(
		message: string = 'Sorry, Something went wrong.',
		context: string,
		statusCode: number = 500,
		originalError?: unknown,
	) {
		super(statusCode, message, context, {}, false, undefined, originalError);
	}
}

export class BadRequestException extends AppError {
	constructor(message: string, context: string) {
		super(400, message, context);
	}
}

export class NotFoundException extends AppError {
	constructor(message: string, context: string) {
		super(404, message, context);
	}
}

export class UnAuthorizedException extends AppError {
	constructor(message: string, context: string) {
		super(401, message, context);
	}
}

export class ForbiddenException extends AppError {
	constructor(message: string, context: string) {
		super(403, message, context);
	}
}

export class ConflictException extends AppError {
	constructor(message: string, context: string, errors: IFieldErrors = {}) {
		super(409, message, context, errors);
	}
}

export class ManyRequestsException extends AppError {
	constructor(
		message: string = 'Too many requests, please try again later',
		context: string = 'too_many_requests',
		remainingSeconds?: number,
		errors: IFieldErrors = {},
	) {
		super(429, message, context, errors, true, remainingSeconds);
	}
}

export class ValidationErrorsException extends AppError {
	constructor(errors: IFieldErrors, message: string = 'Validation fields error', context: string = 'validation_Errors') {
		super(400, message, context, errors, true);
	}
}

// todo: handle TimeoutError
// export class TimeoutException extends AppError {
// 	constructor(message: string = '', context: string = 'TimeoutError', original: unknown = undefined) {
// 		super(499, message, context, undefined, true, undefined, original);
// 	}
// }
