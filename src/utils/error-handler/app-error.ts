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
		public remainingSeconds?: number,
		public status: string = `${statusCode}`.endsWith('4') ? 'Fail' : 'Error',
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = this.constructor.name;

		Error.captureStackTrace(this, this.constructor);
	}
}


export default AppError;
