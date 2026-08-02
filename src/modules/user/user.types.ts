import { ObjectId } from 'mongoose';
import { GenderEnum, ProviderEnum, RoleEnum, TGender, TProvider, TRole } from './user.enums';

export interface IUserImg {
	id: string;
	url: string;
}
export interface IUser {
	_id: ObjectId | string;
	id: ObjectId | string;

	firstName: string;
	lastName: string;
	username: string;
	email: string;
	password?: string;
	gender: TGender;

	bio?: string;
	avatar?: IUserImg | null | undefined;
	covers?: IUserImg[];

	birthDate?: Date;
	phone: string;

	provider: TProvider;

	role: TRole;

	verifiedAt?: Date;
	loggedOutAllAt?: Date;

	deactivatedAt?: Date;
	deactivatedBy?: ObjectId | string;
	deletedAt?: Date;
}


export interface ISessionInfo {
	ip: string | undefined;
	device: string | undefined;
	createdAt: Date;
}