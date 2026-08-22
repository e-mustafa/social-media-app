import { Model, Schema, model } from 'mongoose';
import { NotificationTypeEnum } from './notification.enum';
import { INotification } from './notification.types';

const notificationSchema = new Schema<INotification>(
	{
		sendTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		sendBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		type: {
			type: String,
			enum: Object.values(NotificationTypeEnum),
			required: true,
		},
		title: {
			type: String,
			required: true,
			maxLength: 100,
			minLength: 3,
			trim: true,
		},
		body: {
			type: String,
			required: true,
			maxLength: 1000,
			minLength: 3,
			trim: true,
		},

		readAt: Date,

		requestId: { type: Schema.Types.ObjectId, ref: 'Friend' },
		postId: { type: Schema.Types.ObjectId, ref: 'Post' },
		commentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
		// replyId: { type: Schema.Types.ObjectId, ref: 'comment' },
		reactionId: { type: Schema.Types.ObjectId, ref: 'Reaction' },
	},
	{ timestamps: true },
);

// Ensure a user cannot block the same user multiple times
notificationSchema.index({ sendTo: 1, createdAt: 1 });
notificationSchema.index({ sendTo: 1, readAt: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 45 }); // Delete notifications older than 45 days

export const Notification: Model<INotification> = model<INotification>('Notification', notificationSchema);
