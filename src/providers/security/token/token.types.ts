import { JwtPayload } from 'jsonwebtoken';
import { IUser } from '../../../modules/user/user.types';
import { Id } from '../../../shared/types';

export type TTokens = {
	accessToken: string;
	refreshToken: string;
	accessExpiration: number;
	refreshExpiration: number;

	tokenId?: string;
};

export interface IUserPayload extends Pick<IUser, '_id' | 'email' | 'firstName' | 'role'> {}

export interface IJwtPayload extends JwtPayload {
	id: Id;
	_id: Id;
	email: string;
	name: string;
	remembered: 0 | 1;
}
