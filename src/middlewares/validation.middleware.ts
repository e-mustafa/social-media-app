import { NextFunction, Request, Response } from 'express';
import { InternalException, ValidationErrorsException } from '../utils/response/exception.response';
import { IFieldErrors, TSchema, TSchemaKey } from '../utils/types/shared.type';
import { validateFields } from '../utils/validation/validate-fields.validation';

// Express Middleware for validating request data against Zod schemas
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

			// if (!req[key]) req[key] = {};
			// Read target property safely without triggering getter errors or using 'any'
			const currentSegmentData = (req[key] as Record<string, unknown> | undefined) || {};

			const result = validateFields(currentSchema, currentSegmentData);

			if (!result?.success && result?.errors) {
				validationErrors[key] = result?.errors;
			} else if (result?.success && result?.data !== undefined) {
				// Safely assign validated and coerced data using Object.defineProperty to bypass getter-only properties
				Object.defineProperty(req, key, {
					value: result.data,
					writable: true,
					configurable: true,
					enumerable: true,
				});
			}
		});

		// Throw validation exception if errors exist
		if (Object.keys(validationErrors).length > 0) {
			throw new ValidationErrorsException(validationErrors, 'Validation fields Error', 'validation_Errors_Middleware');
		}

		next();
	};
}
