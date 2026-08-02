import { NextFunction, Request, Response } from 'express';
import { IFieldErrors, TSchemaKey, TSchema } from '../utils/types/shared.type';
import { validateFields } from '../utils/validation/validate-fields.validation';
import multer from 'multer';
import { ZodType } from 'zod';
import { InternalException, ValidationErrorsException } from '../utils/response/exception.response';

type TFile = Express.Multer.File;

// interface IRequest extends Request, Express.Request {
// 	file?: TFile;
// 	files?: TFile[];
// }

export function validation(schema: TSchema) {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req || !schema) {
			throw new InternalException('Validation schema or data is missing', 'ValidationError');
		}

		// Initialize req.body and inject Multer file uploads dynamically
		req.body = req.body || {};

		if (req.file) {
			req.body[req.file.fieldname] = req.file;
		}

		if (req.files) {
			if (Array.isArray(req.files)) {
				req.files.forEach((file) => {
					req.body[file.fieldname] = req.body[file.fieldname] || [];
					(req.body[file.fieldname] as unknown[]).push(file);
				});
			} else if (typeof req.files === 'object') {
				Object.entries(req.files).forEach(([key, fileArray]) => {
					req.body[key] = fileArray;
				});
			}
		}

		const targetKeys = Object.keys(schema) as TSchemaKey[];
		const validationErrors: IFieldErrors = {};
		// console.log('existSchemas', existSchemas);

		// Validate each defined segment (body, query, params, headers)
		targetKeys.forEach((key) => {
			const currentSchema = schema[key];
			if (!currentSchema) return;

			if (!req[key]) req[key] = {};

			const result = validateFields(schema[key] as ZodType, req[key]);
			if (!result?.success && result?.errors) {
				validationErrors[key] = result?.errors;
			} else if (result?.success && result?.data) {
				req[key] = result.data;
			}
		});

		// Throw validation exception if errors exist
		if (Object.keys(validationErrors).length > 0) {
			throw new ValidationErrorsException(validationErrors, 'Validation fields Error', 'validation_Errors_Middleware');
		}

		next();
	};;;
}
