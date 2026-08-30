import { HydratedDocument } from 'mongoose';
import { Id } from '../../shared/types';
import { IGeneralUser } from '../user';

export interface IGroupImg {
	id: string;
	url: string;
}

export interface IChat {
	_id: Id;
	id?: string;

	participants: Id[];

	lastMessage: string;
	lastMessageAt: Date;
	lastMessageBy: Id;

	// group
	groupName: string;
	groupDescription: string;
	groupImg: IGroupImg;
	roomId: string;
	createdBy: Id;

	isGroup?: boolean;

	createdAt: Date;
	updatedAt?: Date;
}

export type HChat = HydratedDocument<IChat>;

export type ChatWUers = IChat & { participants: IGeneralUser[]; lastMessageBy: IGeneralUser };

// export interface IUserLeanResult {
// 	_id: Id;
// 	blockedUsers?: Id[];
// 	friends?: Id[];
// }
