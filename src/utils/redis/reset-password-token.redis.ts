import { appConfig } from '../../config/app.config';
import { Id } from '../../shared/types';
import { BaseRedisCache } from './base-redis-services';

export const redisResetPasswordToken = new BaseRedisCache<string, Id>(
	(hashedToken) => `users:reset:${hashedToken}`,
	appConfig.otp.resetPassword.expiresIn,
);

// export const resetPasswordServices = {
// 	set: async (
// 		hashedToken: string,
// 		userId: ObjId | string,
// 		expiresInSeconds: number = appConfig.otp.resetPassword.expiresIn,
// 	): Promise<void> => {
// 		await redisDB.set(`users:reset:${hashedToken}`, `${userId}`, {
// 			expiration: {
// 				type: 'EX',
// 				value: expiresInSeconds, // 10 minutes
// 			},
// 		});
// 	},
// 	tll: async (hashedToken: string): Promise<number> => {
// 		return await redisDB.ttl(`users:reset:${hashedToken}`);
// 	},

// 	get: async (hashedToken: string): Promise<string | null> => {
// 		return await redisDB.get(`users:reset:${hashedToken}`);
// 	},

// 	delete: async (hashedToken: string): Promise<void> => {
// 		await redisDB.del(`users:reset:${hashedToken}`);
// 	},
// };
