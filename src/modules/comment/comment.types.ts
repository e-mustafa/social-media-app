import { HydratedDocument } from 'mongoose';
import { Id, TAttachment } from '../../shared/types';
import { IGeneralUser } from '../user/user.types';

export interface IComment {
	_id: Id;
	id: Id;

	content: string;
	author: Id;
	postId: Id;
	parentId: Id | null;
	attachments?: TAttachment[];

	reactionsCount: number;
	repliesCount: number;
	taggedUsers: Id[];

	createdAt: Date;
	updatedAt?: Date;
}

export type ICommentDocument = HydratedDocument<IComment>;
export type ICommentWAuthor = IComment & { author: IGeneralUser };
