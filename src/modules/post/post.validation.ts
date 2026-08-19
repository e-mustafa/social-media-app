import z from 'zod';
import { appConfig } from '../../config/app.config';
import { sortOrderEnum } from '../../shared/enums/query.enum';
import { IFile } from '../../shared/types';
import {
	arrayIdsSchema,
	attachmentsDBSchema,
	generalFields,
	parseFormDataArray,
} from '../../shared/validation/general-fields.validation';
import { PostVisibilityEnum } from './post.enum';

const { defaultOrder, defaultLimit } = appConfig.post;

export const postIdParamsSchema = {
	params: z.strictObject({
		postId: generalFields.id,
	}),
};

const postSchema = z.strictObject({
	content: z.string().min(2, 'Content must be at least 2 character.').max(5000, 'Content must be at most 5000 character.'),
	// author: generalFields.id,
	// attachments: z.array(generalFields.file).optional(),
	isPublished: z.coerce
		.boolean()
		.transform((val) => Boolean(val))
		.default(true),
	visibility: z.enum(Object.values(PostVisibilityEnum)).default(PostVisibilityEnum.PUBLIC),
	taggedUsers: parseFormDataArray(arrayIdsSchema).optional(),
});

export const createPostSchema = {
	body: postSchema,
	files: z.object({
		attachments: z.array(generalFields.file).optional(),
	}),
};
export type ICreatePostDTO = z.infer<typeof createPostSchema.body> & { attachments?: IFile[] };

export const updatePostSchema = {
	body: postSchema
		// .omit({ author: true }) // Reject author modification during updates for security
		.extend({
			removedAttachmentIds: parseFormDataArray(arrayIdsSchema).optional(),
			attachments: z.array(attachmentsDBSchema).optional(),
		})
		.partial(),
	files: z.object({
		attachments: z.array(generalFields.file).optional(),
	}),
	params: postIdParamsSchema.params,
};
export type IUpdatePostDTO = z.infer<typeof updatePostSchema.body>;

export const getPostsSchema = {
	query: z.object({
		page: generalFields.page.default(1).optional(),
		limit: generalFields.limit.default(defaultLimit || 10).optional(),
		order: generalFields.order.default(defaultOrder || sortOrderEnum.ASC).optional(),
		search: generalFields.search.optional(),
	}),
};

export type IGetPostsQueryDTO = z.infer<typeof getPostsSchema.query>;
