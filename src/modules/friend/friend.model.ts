import { model, Model, Schema } from 'mongoose';
import { FriendRequestStatusEnum } from './friend.enum';
import { IFriend } from './friend.types';

const friendSchema = new Schema<IFriend>(
	{
		sendBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		sendTo: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		status: {
			type: String,
			enum: Object.values(FriendRequestStatusEnum),
			default: FriendRequestStatusEnum.PENDING,
		},
	},
	{
		timestamps: true,
	},
);

const Friend: Model<IFriend> = model('Friend', friendSchema);

export default Friend;
