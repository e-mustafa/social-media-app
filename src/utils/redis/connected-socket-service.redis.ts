import { appConfig } from '../../config/app.config';
import { BaseRedisCache } from './base-redis-services';

export const redisConnectedSocket = new BaseRedisCache<string, string[]>(
	(userId) => `users:${userId}:sockets`,
	appConfig.socket.expiresIn,
);

// export const revertEmailTokenServices = {
// 	set: async (userId: Id, sockets: string[], expiresInSeconds = appConfig.otp.revertEmail.expiresIn): Promise<void> => {
// 		await redisDB.set(`users:${userId}:sockets`, JSON.stringify(sockets), {
// 			expiration: {
// 				type: 'EX',
// 				value: expiresInSeconds, // 7 days
// 			},
// 		});
// 	},
// 	tll: async (userId: Id): Promise<number> => {
// 		return await redisDB.ttl(`users:${userId}:sockets`);
// 	},

// 	get: async (userId: Id): Promise<string | null> => {
// 		return await redisDB.get(`users:${userId}:sockets`);
// 	},

// 	delete: async (userId: Id): Promise<void> => {
// 		await redisDB.del(`users:${userId}:sockets`);
// 	},
// };
