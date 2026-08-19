import z from 'zod';
import { generalFields, getFileSchema } from '../../shared/validation/general-fields.validation';
import { sortOrderEnum } from '../../shared/enums/query.enum';

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
	file: z.strictObject({
		avatar: getFileSchema('Avatar image is required'),
	}),
};
export type IUploadAvatarDTO = z.infer<typeof uploadAvatarSchema.file>;

export const uploadCoverSchema = {
	file: z.strictObject({
		cover: getFileSchema('Cover image is required'),
	}),
};
export type IUploadCoverDTO = z.infer<typeof uploadCoverSchema.file>;

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

export const getUsersSchema = {
	query: z.object({
		page: generalFields.page.default(1).optional(),
		limit: generalFields.limit.default(10).optional(),
		order: generalFields.order.default( sortOrderEnum.DESC).optional(),
		search: generalFields.search.optional(),
	}),
};
