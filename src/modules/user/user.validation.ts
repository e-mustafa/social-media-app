import z from 'zod';
import { generalFields } from '../../utils/validation/general-fields.validation';

export const updateProfileSchema = {
	body: z
		.strictObject({
			firstName: generalFields.firstName,
			lastName: generalFields.lastName,
			username: generalFields.username,
			bio: generalFields.bio,
			gender: generalFields.gender,
			birthdate: generalFields.birthdate,
			phone: generalFields.phone,
		})
		.partial(),
};
export type IUpdateProfileDTO = z.infer<typeof updateProfileSchema.body>;

export const uploadAvatarSchema = {
	body: z.strictObject({
		avatar: generalFields.file,
	}),
};
export type IUploadAvatarODT = z.infer<typeof uploadAvatarSchema.body>;

export const uploadCoverSchema = {
	body: z.strictObject({
		cover: generalFields.file,
	}),
};

export type IUploadCoverDTO = z.infer<typeof uploadCoverSchema.body>;

export const paramsIdSchema = {
	params: z.strictObject({
		userId: generalFields.id,
	}),
};
export type IParamsIdDTO = z.infer<typeof paramsIdSchema.params>;

export const resetPasswordSchema = {
	body: z.strictObject({
		token: generalFields.token,
		password: generalFields.password,
		confirmPassword: generalFields.confirmPassword,
	}),
};
export type IResetPasswordDTO = z.infer<typeof resetPasswordSchema.body>;
