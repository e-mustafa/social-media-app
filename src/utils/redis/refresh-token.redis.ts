import { appConfig } from '../../config/app.config';
import { ISessionInfo } from '../../modules/user/user.types';
import { ObjId } from '../../shared/types/validation.type';
import { BaseRedisCache } from './base-redis-services';

export const redisRefreshToken = new BaseRedisCache<[string | ObjId, string] | string | ObjId, ISessionInfo>(
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
