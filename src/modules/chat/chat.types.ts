import { HydratedDocument } from 'mongoose';
import { Id, TAttachment } from '../../shared/types';
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

export interface ISendMessagePayload {
	chatId?: string;
	content: string;
	sendTo: string;
	attachments?: TAttachment[];
	clientTempId?: string;
}

export interface ISendGroupMessagePayload {
	groupId: string;
	content: string;
	attachments?: TAttachment[];
	clientTempId?: string;
}

// Added Missing Event Payloads for strict type checks
export interface IChatRoomPayload {
	chatId: string;
}

export interface IGroupRoomPayload {
	roomId: string;
}

export interface IUserTypingPayload {
	chatId: string;
	isTyping?: boolean;
}

export interface IMarkAsSeenPayload {
	senderId: string;
	chatId: string;
}
