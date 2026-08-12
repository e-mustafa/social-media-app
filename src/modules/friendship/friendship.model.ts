import { model, Model, Schema } from 'mongoose';
import { FriendRequestStatusEnum } from './friendship.enums';
import { IFriendship } from './friendship.types';

const friendshipSchema = new Schema<IFriendship>(
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

const Friendship: Model<IFriendship> = model('Friendship', friendshipSchema);

export default Friendship;
