import z from 'zod';
import { appConfig } from '../../config/app.config';
import { sortOrderEnum } from '../../shared/enums/query.enum';
import { IFile } from '../../shared/types';
import { arrayIdsSchema, generalFields, parseFormDataArray } from '../../shared/validation/general-fields.validation';

const { defaultOrder, defaultLimit } = appConfig.chat;

export const chatIdParamsSchema = {
	params: z.strictObject({
		chatId: generalFields.id,
	}),
};

export const createGroupSchema = {
	body: z.strictObject({
		participants: parseFormDataArray(arrayIdsSchema),
		groupName: z
			.string()
			.min(3, 'Group name must be at least 3 character.')
			.max(100, 'Content must be at most 100 character.'),
	}),
	files: z.object({
		groupImg: z.array(generalFields.file).optional(),
	}),
};
export type ICreateGroupDTO = z.infer<typeof createGroupSchema.body> & { groupImg?: IFile[] };



export const getChatMessagesSchema = {
	params: z.strictObject({
		chatId: generalFields.id,
	}),
	query: z.object({
		page: generalFields.page.optional(),
		limit: generalFields.limit.optional(),
		order: generalFields.order.optional(),
		search: generalFields.search.optional(),
	}),
};
export type IGetChatMessagesQueryDTO = z.infer<typeof getChatMessagesSchema.query>;
