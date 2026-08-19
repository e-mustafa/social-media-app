import { HydratedDocument } from 'mongoose';
import { Id, TAttachment } from '../../shared/types';
import { IGeneralUser } from '../user';
import { TPostVisibility } from './post.enum';

export interface IPost {
	_id: Id;
	id?: Id;
	content: string;
	author: Id;
	attachments?: TAttachment[];
	isPublished: boolean;
	visibility: TPostVisibility;
	reactionsCount: number;
	commentsCount: number;
	taggedUsers: Id[];

	createdAt: Date;
	updatedAt?: Date;
}

export type IPostDocument = HydratedDocument<IPost>;
export type IPostWAuthor = IPost & { author: IGeneralUser };
export type IPostWTaggedUsers = IPost & { taggedUsers: IGeneralUser[] };
export type IPostWUsers = IPost & { author: IGeneralUser; taggedUsers: IGeneralUser[] };
