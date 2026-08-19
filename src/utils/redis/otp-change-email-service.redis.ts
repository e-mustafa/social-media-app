import { appConfig } from '../../config/app.config';
import { ObjId } from '../../shared/types/validation.type';
import { redisDB } from './client.redis';

export const changeEmailOtpServices = {
	set: async (
		userId: ObjId | string,
		{ otp, newEmail }: { otp: string; newEmail: string },
		expiresInSeconds = appConfig.otp.changeEmail.expiresIn,
	): Promise<void> => {
		await redisDB.set(`users:${userId}:email-change`, JSON.stringify({ newEmail, otp }), {
			expiration: {
				type: 'EX',
				value: expiresInSeconds, // 5 minutes
			},
		});
	},
	tll: async (userId: ObjId | string): Promise<number> => {
		return await redisDB.ttl(`users:${userId}:email-change`);
	},

	get: async (userId: ObjId | string): Promise<string | null> => {
		return await redisDB.get(`users:${userId}:email-change`);
	},

	delete: async (userId: ObjId | string): Promise<void> => {
		await redisDB.del(`users:${userId}:email-change`);
	},
};
