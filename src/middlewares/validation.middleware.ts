// src/middlewares/validation.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { InternalException, ValidationErrorsException } from '../shared/response/exception.response';
import { IFieldErrors, TSchema, TSchemaKey } from '../shared/types/validation.type';
import { validateFields } from '../shared/validation/validate-fields.validation';

export function validation(schema: TSchema) {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req || !schema) {
			throw new InternalException('Validation schema or data is missing', 'ValidationError');
		}

		// 1. Build an isolated container for file objects (DO NOT mutate req.body)
		const filesData: Record<string, unknown> = {};

		if (req.file) {
			filesData[req.file.fieldname] = req.file;
		}

		if (req.files) {
			if (Array.isArray(req.files)) {
				// Map array directly under its fieldname (e.g., 'attachments')
				if (req.files.length > 0) {
					const fieldName = req.files[0]?.fieldname!;
					filesData[fieldName] = req.files;
				}
			} else if (typeof req.files === 'object') {
				Object.entries(req.files).forEach(([key, fileArray]) => {
					filesData[key] = fileArray;
				});
			}
		}

		const targetKeys = Object.keys(schema) as TSchemaKey[];
		const validationErrors: IFieldErrors = {};

		// 2. Validate targets (body, params, query, headers, files)
		targetKeys.forEach((key) => {
			const currentSchema = schema[key];
			if (!currentSchema) return;

			const currentSegmentData =
				key === 'files' || key === 'file'
					? filesData
					: (req[key as keyof Request] as Record<string, unknown> | undefined) || {};

			const result = validateFields(currentSchema, currentSegmentData);

			if (!result?.success && result?.errors) {
				// Redirect 'file/s' validation errors into 'body' error object for Frontend consistency
				if (key === 'files' || key === 'file') {
					validationErrors.body = {
						...(validationErrors.body || {}),
						...result.errors,
					};
				} else {
					validationErrors[key] = {
						...(validationErrors[key] || {}),
						...result.errors,
					};
				}
			} else if (result?.success && result.data !== undefined) {
				if (key !== 'files') {
					Object.defineProperty(req, key, {
						value: result.data,
						writable: true,
						configurable: true,
						enumerable: true,
					});
				}
			}
		});

		// 3. Throw formatted validation exceptions
		if (Object.keys(validationErrors).length > 0) {
			throw new ValidationErrorsException(validationErrors, 'Validation fields Error', 'validation_Errors_Middleware');
		}

		next();
	};
}
