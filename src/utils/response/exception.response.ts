import AppError from '../error-handler/app-error';
import { IFieldErrors } from '../types/shared.type';

export class InternalException extends AppError {
	constructor(message: string = 'Sorry, Something went wrong.', context: string, statusCode: number = 500) {
		super(statusCode, message, context, {}, true);
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

export class ConflictException extends AppError {
	constructor(message: string, context: string, errors: IFieldErrors = {}) {
		super(409, message, context, errors);
	}
}

export class ManyRequestsException extends AppError {
	constructor(
		message: string = 'To many requests, please try again later',
		context: string,
		remainingSeconds?: number,
		errors: IFieldErrors = {},
	) {
		super(429, message, context, errors, true, remainingSeconds);
	}
}

export class ValidationErrorsException extends AppError {
	constructor(Errors: IFieldErrors, message: string = 'Validation fields error', context: string = 'validation_Errors') {
		super(400, message, context, Errors, true);
	}
}
