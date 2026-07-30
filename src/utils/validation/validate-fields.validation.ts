import { ZodError, ZodType } from 'zod';

type TErrors = Record<string, string>;

/**
 * Formats ZodError issues into a flat key-value map.
 */
/**
 * Formats ZodError issues into a flat key-value map.
 */
const formatZodErrors = (error: ZodError): TErrors => {
	const formattedErrors: TErrors = {};

	error.issues.forEach((issue) => {
		// Fallback to '_root' if path is empty (e.g., schema-level errors)
		const path = issue.path.length > 0 ? issue.path.join('.') : '_root';

		// Retain only the first error message per field
		if (!formattedErrors[path]) {
			formattedErrors[path] = issue.message;
		}
	});

	return formattedErrors;
};

export const validateFields = <T>(
	schema: ZodType,
	data: T,
): { success: boolean; errors?: TErrors; data?: T } | undefined => {
	if (!schema || !data) return;

	const result = schema.safeParse(data ?? {});
	console.log('result', result);

	if (!result.success) {
		return { success: false, errors: formatZodErrors(result.error) };
	}

	return { success: result.success, data: result.data as T };
};
