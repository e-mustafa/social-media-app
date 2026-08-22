import { HydratedDocument } from 'mongoose';
import { Id } from '../../shared/types';
import { TFriendRequestStatus } from './friend.enum';

export interface IFriend {
	_id: Id;
	id?: string;
	sendBy: Id;
	sendTo: Id;
	status: TFriendRequestStatus;
	createdAt: Date;
	updatedAt?: Date;
}

export type IFriendDocument = HydratedDocument<IFriend>;

// export interface IUserLeanResult {
// 	_id: Id;
// 	blockedUsers?: Id[];
// 	friends?: Id[];
// }
