import { ObjectId } from 'mongoose';
import { appConfig } from '../../config/app.config';
import { ISessionInfo } from '../../modules/user/user.types';
import { BaseRedisCache } from './base-redis-services';

export const redisRefreshToken = new BaseRedisCache<[string | ObjectId, string] | string | ObjectId, ISessionInfo>(
	(keys) => {
		if (Array.isArray(keys)) {
			const [userId, jti] = keys || [];
			return jti ? `users:refresh_tokens:${userId}:${jti}` : `users:refresh_tokens:${userId}:*`;
		} else {
			return `users:refresh_tokens:${keys}:*`;
		}
	},
	appConfig.otp.refreshToken.expiresIn,
	true,
);
