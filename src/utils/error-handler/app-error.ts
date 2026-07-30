import { IFieldErrors } from '../types/shared.type';

export interface IError extends Error {
	statusCode: number;
	context: string;
	errors: IFieldErrors;
	status: string;
}

class AppError extends Error {
	constructor(
		public statusCode: number = 500,
		message: string,
		public context: string,
		public errors: IFieldErrors = {},
		// status = `${statusCode}`.endsWith('4')? 'Client Error' : 'Server Error',
		public isOperational: boolean = true,
		public status: string = `${statusCode}`.endsWith('4') ? 'Fail' : 'Error',
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = this.constructor.name;

		Error.captureStackTrace(this, this.constructor);
	}
}

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

export class ValidationErrorsException extends AppError {
	constructor(Errors: IFieldErrors, message: string = 'Validation fields error', context: string = 'validation_Errors') {
		super(400, message, context, Errors, true);
	}
}

export default AppError;
