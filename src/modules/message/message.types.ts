import { HydratedDocument } from 'mongoose';
import { Id, ObjId, TAttachment } from '../../shared/types';
import { TReactionType } from '../reaction/reaction.enum';

export type IMessageAttachment = TAttachment & {
	id: string;
	url: string;
	resourceType?: 'image' | 'video' | 'raw' | 'file';
	name?: string;
	size?: number;
};

export interface IGroupImg {
	id: string;
	url: string;
}

export interface IMessage {
	_id: ObjId;
	id?: string;

	sender: Id;
	receiver: Id;

	chat: Id;
	content: string;
	attachments?: IMessageAttachment[];

	readAt: Date;

	reaction?: TReactionType;

	// group: string;
	// groupImg: IGroupImg;
	// roomId: string;

	createdAt: Date;
	updatedAt?: Date;
}

export type HMessage = HydratedDocument<IMessage>;

// export interface IUserLeanResult {
// 	_id: Id;
// 	blockedUsers?: Id[];
// 	friends?: Id[];
// }
