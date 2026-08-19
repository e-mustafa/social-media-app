import z from 'zod';
import { generalFields } from '../../shared/validation/general-fields.validation';

export const checkUsernameSchema = {
	body: z.strictObject({
		username: generalFields.username,
	}),
};

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
			error: 'Passwords mismatch',
			path: ['confirmPassword'],
		}),
};
export type IRegisterDTO = z.infer<typeof registerSchema.body>;

export const resendOtpSchema = {
	body: z.strictObject({
		email: generalFields.email,
	}),
};
export type IResendOtpODT = z.infer<typeof resendOtpSchema.body>;

export const verifyAccountSchema = {
	body: z.strictObject({
		email: generalFields.email,
		otp: generalFields.otp,
	}),
};
export type IVerifyAccountDTO = z.infer<typeof verifyAccountSchema.body>;

export const loginSchema = {
	body: z.strictObject({
		email: generalFields.email,
		password: generalFields.password,
		rememberMe: z.boolean().optional().default(false),
	}),
};
export type ILoginDTO = z.infer<typeof loginSchema.body>;

export const refreshAccessTokenSchema = {
	cookies: z.strictObject({
		refreshToken: z.string().min(1, 'Authorization header is required'),
	}),
	// .loose(),
};
export type IRefreshAccessTokenDTO = z.infer<typeof refreshAccessTokenSchema.cookies>;

export const socialGoogleSchema = {
	body: z.strictObject({
		idToken: z.string().min(1, 'ID token is required'),
	}),
};
export type ISocialGoogleDTO = z.infer<typeof socialGoogleSchema.body>;

export const changePasswordSchema = {
	body: z
		.strictObject({
			currentPassword: generalFields.password,
			newPassword: generalFields.password,
			confirmNewPassword: generalFields.confirmPassword,
		})
		.refine((data) => data.newPassword === data.confirmNewPassword, {
			error: 'new and confirm Passwords mismatch',
			path: ['confirmNewPassword'],
		})
		.refine((data) => data.currentPassword !== data.newPassword, {
			error: 'New password cannot be the same as current password',
			path: ['newPassword'],
		}),
};
export type IChangePasswordDTO = z.infer<typeof changePasswordSchema.body>;

export const forgetPasswordSchema = {
	body: z.strictObject({
		email: generalFields.email,
	}),
};
export type IForgetPasswordDTO = z.infer<typeof forgetPasswordSchema.body>;

export const resetPasswordSchema = {
	body: z
		.strictObject({
			token: generalFields.token,
			password: generalFields.password,
			confirmPassword: generalFields.confirmPassword,
		})
		.refine((data) => data.password === data.confirmPassword, {
			error: 'Passwords mismatch',
			path: ['confirmPassword'],
		}),
};
export type IResetPasswordDTO = z.infer<typeof resetPasswordSchema.body>;

export const reactivateAccountSchema = {
	body: z.strictObject({
		email: generalFields.email,
		reactivationToken: generalFields.token,
	}),
};

export type IReactivateAccount = z.infer<typeof reactivateAccountSchema.body>;
