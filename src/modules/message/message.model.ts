import { model, Model, Schema } from 'mongoose';
import { attachmentsSchemaDB } from '../post';
import { IMessage } from './message.types';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

const messageSchema = new Schema<IMessage>(
	{
		chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },

		sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },

		attachments: attachmentsSchemaDB,
		content: {
			type: String,
			trim: true,
			minLength: [1, 'Content must be at least 1 characters long'],
			maxLength: [5000, 'Content must be at most 5000 characters long'],
			required: function (this: IMessage) {
				return this?.attachments?.length === 0 || true;
			},
		},
		readAt: Date,
		// group: {
		// 	type: String,
		// },
		// groupImg: {
		// 	type: {
		// 		id: { type: String, required: true },
		// 		url: { type: String, required: true },
		// 	},
		// },
		// roomId: String,
	},
	{
		timestamps: true,
	},
);

// use mongoose-lean-virtuals to get virtuals in lean queries
messageSchema.plugin(mongooseLeanVirtuals);

messageSchema.index({ chat: 1, sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1, readAt: -1 });
messageSchema.index({ content: 1, readAt: -1 });

const Message: Model<IMessage> = model<IMessage>('Message', messageSchema);

export default Message;
