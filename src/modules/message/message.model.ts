import { model, Model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { attachmentsSchemaDB } from '../post';
import { ReactionTypeEnum } from '../reaction/reaction.enum';
import { IMessage } from './message.types';

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

		reaction: {
			type: String,
			enum: Object.values(ReactionTypeEnum),
		},

		// deliveredAt: Date,
		// replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },

		// TODO: add message status field to track if the message is sent, delivered, or read
		// TODO: add message replyTo
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

messageSchema.virtual('status').get(function (this: IMessage) {
	if (this.readAt) return 'read';
	// if (this.deliveredAt) return 'delivered';
	return 'sent';
});

const Message: Model<IMessage> = model<IMessage>('Message', messageSchema);

export default Message;
