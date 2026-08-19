import { IFieldErrors } from '../../shared/types/validation.type';

export interface IError extends Error {
	statusCode: number;
	context: string;
	errors: IFieldErrors;
	remainingSeconds?: number;
	isOperational: boolean;
	status: string;
}

abstract class AppError extends Error {
	constructor(
		public statusCode: number = 500,
		message: string,
		public context: string,
		public errors: IFieldErrors = {},
		public isOperational: boolean = true,
		public remainingSeconds?: number,
		public originalError?: unknown,
		public status: string = `${statusCode}`.startsWith('4') ? 'Fail' : 'Error',
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = this.constructor.name;

		// Preserve the original stack trace if available to avoid losing line-number details
		if (originalError instanceof Error && originalError.stack) {
			this.stack = originalError.stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

export default AppError;
