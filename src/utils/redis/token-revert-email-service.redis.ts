import { appConfig } from '../../config/app.config';
import { Id } from '../../shared/types/validation.type';
import { redisDB } from './client.redis';

export const revertEmailTokenServices = {
	set: async (
		userId: Id,
		{ token, oldEmail }: { token: string; oldEmail: string },
		expiresInSeconds = appConfig.otp.revertEmail.expiresIn,
	): Promise<void> => {
		await redisDB.set(`users:${userId}:email-revert`, JSON.stringify({ oldEmail, token }), {
			expiration: {
				type: 'EX',
				value: expiresInSeconds, // 7 days
			},
		});
	},
	tll: async (userId: Id): Promise<number> => {
		return await redisDB.ttl(`users:${userId}:email-revert`);
	},

	get: async (userId: Id): Promise<string | null> => {
		return await redisDB.get(`users:${userId}:email-revert`);
	},

	delete: async (userId: Id): Promise<void> => {
		await redisDB.del(`users:${userId}:email-revert`);
	},
};
