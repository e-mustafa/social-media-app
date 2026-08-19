import z from 'zod';
import { appConfig } from '../../config/app.config';
import { sortOrderEnum } from '../../shared/enums/query.enum';
import {
	arrayIdsSchema,
	generalFields,
	parseFormDataArray,
	taggedUsers,
} from '../../shared/validation/general-fields.validation';

const { defaultOrder, defaultLimit } = appConfig.comment;

const content = z
	.string()
	.min(2, 'Content must be at least 2 character.')
	.max(1000, 'Content must be at most 1000 character.');

const commentSchema = z.strictObject({
	content,
	parentId: generalFields.id.nullable().default(null),
	taggedUsers: taggedUsers,
});

export const createCommentSchema = {
	body: commentSchema,

	files: z.object({
		attachments: z.array(generalFields.file).optional(),
	}),

	params: z.strictObject({
		postId: generalFields.id,
	}),
};
export type ICreateCommentDTO = z.infer<typeof createCommentSchema.body>;

export const updateCommentSchema = {
	body: commentSchema
		.extend({
			removedAttachmentIds: parseFormDataArray(arrayIdsSchema).optional(),
			// attachments: z.array(attachmentsDBSchema),
		})
		.partial(),
	files: z.object({
		attachments: z.array(generalFields.file).optional(),
	}),
	params: z.strictObject({
		commentId: generalFields.id,
	}),
};
export type IUpdateCommentDTO = z.infer<typeof updateCommentSchema.body>;

export const getPostCommentsSchema = {
	params: z.strictObject({
		postId: generalFields.id,
	}),
	query: z.object({
		page: generalFields.page.default(1).optional(),
		limit: generalFields.limit.default(defaultLimit || 10).optional(),
		order: generalFields.order.default(defaultOrder || sortOrderEnum.ASC).optional(),
	}),
};

export type IGetPostCommentQueryDTO = z.infer<typeof getPostCommentsSchema.query>;

export const createReplySchema = {
	body: z.strictObject({
		content,
		// parentId: generalFields.id,
		taggedUsers: taggedUsers,
	}),

	files: z.object({
		attachments: z.array(generalFields.file).optional(),
	}),

	params: z.strictObject({
		commentId: generalFields.id,
	}),
};
export type ICreateReplyDTO = z.infer<typeof createReplySchema.body>;

export const getCommentRepliesSchema = {
	params: z.strictObject({
		commentId: generalFields.id,
	}),
	query: z.object({
		page: generalFields.page.default(1).optional(),
		limit: generalFields.limit.default(defaultLimit || 10).optional(),
		order: generalFields.order.default(defaultOrder || sortOrderEnum.ASC).optional(),
	}),
};

export type IGetCommentQueryRepliesDTO = z.infer<typeof getCommentRepliesSchema.query>;