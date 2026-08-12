import { Id } from '../../utils/types/shared.type';
import { TFriendRequestStatus } from './friendship.enums';

export interface IFriendship {
	_id: Id;
	id?: string;
	sendBy: Id;
	sendTo: Id;
	status: TFriendRequestStatus;
	createdAt: Date;
	updatedAt?: Date;
}


export interface IUserLeanResult {
	_id: Id;
	blockedUsers?: Id[];
	friends?: Id[];
}