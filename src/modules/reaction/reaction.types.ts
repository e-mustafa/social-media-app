import { HydratedDocument } from 'mongoose';
import { Id, IPaginatedResult } from '../../shared/types';
import { IGeneralUser } from '../user';
import { TReactionType, TTargetType } from './reaction.enum';

export interface IReaction {
	userId: Id;
	targetId: Id;
	targetType: TTargetType;
	reactionType: TReactionType;
}

export type IReactionDocument = HydratedDocument<IReaction>;
export type IReactionWUser = IReaction & { userId: IGeneralUser };

export interface IPaginatedReaction<T> extends IPaginatedResult<T> {
	existReactionTypes?: TReactionType[];
}
