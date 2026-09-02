import { HydratedDocument } from 'mongoose';
import { Id } from '../../shared/types';
import { TGender, TProvider, TRole, TStatusReason, TUserStatus } from './user.enums';

export interface IUserImg {
	id: string;
	url: string;
}
export interface IUser {
	_id: Id;
	id?: string;

	firstName: string;
	lastName: string;
	username: string;
	email: string;
	password?: string;
	gender: TGender;

	bio?: string;
	avatar?: IUserImg | null;
	cover?: IUserImg | null;

	birthdate?: Date;
	phone: string;

	provider: TProvider;

	role: TRole;

	verifiedAt?: Date;
	loggedOutAllAt?: Date;

	status?: TUserStatus;
	statusReason?: TStatusReason;
	statusChangedAt?: Date;

	deviceTokens?: string[];
	notificationEnabled?: boolean;

	deletedAt?: Date;

	lastSeenAt?: Date;

	createdAt: Date;
	updatedAt?: Date;

	name?: string;

	// Lists -----------
	// friends: Id[];
	// blockedUsers: Id[];
	// friendRequests: Id[]; // Received friend requests
	// sentFriendRequests: Id[]; // Sent friend requests
	// rejectedFriendRequests: Id[]; // Rejected/ignored requests
}

export type IUserDocument = HydratedDocument<IUser>;

export interface IGeneralUser extends Pick<
	IUser,
	'_id' | 'id' | 'firstName' | 'lastName' | 'username' | 'bio' | 'gender' | 'avatar' | 'cover'
> {}

export interface ISessionInfo {
	ip: string | undefined;
	device: string | undefined;
	createdAt: Date | string;
}

export interface ISessionResponse extends ISessionInfo {
	active: boolean;
}
