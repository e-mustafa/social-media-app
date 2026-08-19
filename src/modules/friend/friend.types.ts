import { HydratedDocument } from 'mongoose';
import { Id } from '../../shared/types/validation.type';
import { TFriendRequestStatus } from './friend.enums';

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
