import { model, Model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { IChat, IGroupImg } from './chat.types';

const groupImgSchema = new Schema<IGroupImg>({
	id: { type: String, required: true },
	url: { type: String, required: true },
});

const chatSchema = new Schema<IChat>(
	{
		participants: {
			type: [Schema.Types.ObjectId],
			ref: 'User',
			required: true,
		},

		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		groupName: {
			type: String,
			minLength: [3, 'Group name must be at least 3 characters long'],
		},
		groupDescription: {
			type: String,
			minLength: [3, 'Group name must be at least 3 characters long'],
		},
		groupImg: groupImgSchema,
		roomId: {
			type: String,
			unique: true,
		},

		lastMessage: String,
		lastMessageAt: Date,
		lastMessageBy: { type: Schema.Types.ObjectId, ref: 'User' },
	},
	{
		timestamps: true,
		validateBeforeSave: true,
		optimisticConcurrency: true,
		id: true,
		toObject: { virtuals: true },
		toJSON: {
			virtuals: true,
			getters: true,
		},
	},
);

// use mongoose-lean-virtuals to get virtuals in lean queries
chatSchema.plugin(mongooseLeanVirtuals);

chatSchema.virtual('isGroup').get(function () {
	return this.roomId || this.groupName ? true : false;
});

const Chat: Model<IChat> = model<IChat>('Chat', chatSchema);

export default Chat;
