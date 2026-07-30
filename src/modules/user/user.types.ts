import { ObjectId } from 'mongoose';
import { GenderEnum, ProviderEnum } from './user.enums';

export interface IUserImg {
	id: string;
	url: string;
}
export interface IUser {
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	password?: string;
	gender: GenderEnum;

	bio?: string;
	avatar?: IUserImg;
	covers?: IUserImg[];

	birthDate?: Date;
	phone: string;

	provider: ProviderEnum;

	confirmedAt?: Date;
	deactivatedAt?: Date;
	deactivatedBy?: ObjectId;
	deletedAt?: Date;
}
