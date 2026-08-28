import { Request, Response } from 'express';
import { successResponse } from '../../shared/response/success.response';
import { Id, IUserBody } from '../../shared/types';
import { TTargetType } from './reaction.enum';
import services from './reaction.service';
import { IGetReactionsQuery } from './reaction.validation';

export function getReactions(targetType: TTargetType) {
	return async (req: Request, res: Response) => {
		const { existReactionTypes, metadata, data } = await services.getReactions({
			userId: req.user?._id as Id,
			targetId: req.params.targetId as string,
			targetType,
			query: req.query as unknown as IGetReactionsQuery,
		});
		successResponse({ res, existReactionTypes, metadata, data });
	};
}

export function addReaction(targetType: TTargetType) {
	return async (req: Request, res: Response) => {
		const data = await services.addReaction({
			user: req.user as IUserBody,
			targetId: req.params.targetId as string,
			targetType,
			reactionType: req.body.reactionType,
		});
		successResponse({ res, status: 201, message: 'Reaction added successfully', data });
	};
}

export function removeReaction(targetType: TTargetType) {
	return async (req: Request, res: Response) => {
		const data = await services.removeReaction(req.user?._id as Id, req.params.targetId as string, targetType);
		successResponse({ res, message: 'Reaction removed successfully', data });
	};
}
