import z from 'zod';
import { generalFields } from '../../utils/validation/general-fields.validation';

export const registerSchema = {
	body: z
		.strictObject({
			firstName: generalFields.firstName,
			lastName: generalFields.lastName,
			username: generalFields.username,
			email: generalFields.email,
			password: generalFields.password,
			confirmPassword: generalFields.confirmPassword,
		})
		.refine((data) => data.password === data.confirmPassword, {
			error: 'Passwords do not match',
			path: ['confirmPassword'],
		}),
};

export type IRegisterDTO = z.infer<typeof registerSchema.body>;

export const confirmEmailSchema = {
	body: z.strictObject({
		email: generalFields.email,
		otp: generalFields.otp,
	}),
};

export const loginSchema = {
	body: z.strictObject({
		email: generalFields.email,
		password: generalFields.password,
	}),
};
