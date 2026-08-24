import { HydratedDocument } from 'mongoose';
import { Id } from '../../shared/types';
import { TNotificationType } from './notification.enum';
import { IGeneralUser } from '../user';

export interface INotification {
	_id: Id;
	sendTo: Id;
	sendBy: Id;
	type: TNotificationType;
	title: string;
	body: string;

	readAt: boolean;

	requestId?: Id;
	postId?: Id;
	commentId?: Id;
	replyId?: Id;
	reactionId?: Id;

	createdAt: Date;
	updatedAt?: Date;
}

export type INotificationDocument = HydratedDocument<INotification>;
export type INotificationWSender = INotification & { sendBy: IGeneralUser };

export type NotificationPayload = {
	sendTo: Id;
	sendBy: Id;
	type: TNotificationType;
	title: string;
	body: string;
	requestId?: Id;
	postId?: Id;
	commentId?: Id;
	replyId?: Id;
	reactionId?: Id;
};