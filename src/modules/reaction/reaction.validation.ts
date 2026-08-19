import z from 'zod';
import { appConfig } from '../../config/app.config';
import { sortOrderEnum } from '../../shared/enums/query.enum';
import { generalFields } from '../../shared/validation/general-fields.validation';
import { ReactionTypeEnum } from './reaction.enum';

const { defaultOrder, defaultLimit } = appConfig.reaction;

export const addReactionSchema = {
	body: z.strictObject({
		// targetType: z.enum(['post', 'comment'], 'Target type is required'),
		reactionType: z.enum(Object.values(ReactionTypeEnum), 'Reaction type is required').default(ReactionTypeEnum.LIKE),
	}),

	params: z.strictObject({
		targetId: generalFields.id,
	}),
};
export type ICreatePostReactionDTO = z.infer<typeof addReactionSchema.body>;

export const getReactionsSchema = {
	params: z.strictObject({
		targetId: generalFields.id,
	}),
	query: z.object({
		page: generalFields.page.default(1).optional(),
		limit: generalFields.limit.default(defaultLimit || 10).optional(),
		order: generalFields.order.default(defaultOrder || sortOrderEnum.ASC).optional(),
		reactionType: z
			.enum(ReactionTypeEnum, 'Target type is must one of reaction types: ' + Object.values(ReactionTypeEnum).join(', '))
			.optional(),
	}),
};

export type IGetReactionsQuery = z.infer<typeof getReactionsSchema.query>;
