import { appConfig } from '../../config/app.config';
import { BaseRedisCache } from './base-redis-services';

export const reactiveAccountServices = new BaseRedisCache<string, string>(
	(userId) => `users:${userId}:reactivate-account-token`,
	appConfig.otp.reactivateAccount.expiresIn,
);
