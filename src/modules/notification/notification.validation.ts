import z from 'zod';
import { appConfig } from '../../config/app.config';
import { sortOrderEnum } from '../../shared/enums/query.enum';
import { generalFields } from '../../shared/validation/general-fields.validation';

const { defaultOrder, defaultLimit } = appConfig.notification;

export const addDeviceTokenSchema = {
	body: z.strictObject({
		token: generalFields.token,
	}),
};
export type IAddDeviceTokenDTO = z.infer<typeof addDeviceTokenSchema.body>;

export const getNotificationsSchema = {
	query: z.object({
		page: generalFields.page.default(1).optional(),
		limit: generalFields.limit.default(defaultLimit || 10).optional(),
		order: generalFields.order.default(defaultOrder || sortOrderEnum.DESC).optional(),
		unreadOnly: z.coerce.boolean().optional(),
	}),
};
export type IGetNotificationsQueryDTO = z.infer<typeof getNotificationsSchema.query>;

export const paramsIdSchema = {
	params: z.strictObject({
		notificationId: generalFields.id,
	}),
};
