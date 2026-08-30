import { HydratedDocument } from 'mongoose';
import { Id, ObjId, TAttachment } from '../../shared/types';

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
	attachments?: TAttachment[];

	readAt: Date;

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
