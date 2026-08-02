import { appConfig } from '../../config/app.config';
import { BaseRedisCache } from './base-redis-services';

// export const changeEmailOtpService = new BaseRedisCache

export const redisVerifyAccountOtp = new BaseRedisCache<string, string>(
	(email) => `users:${email}:verify_account_otp`,
	appConfig.otp.verifyEmail.expiresIn,
);

export const redisVerifyAccountCooldown = new BaseRedisCache<string, boolean>(
	(email) => `users:${email}:verify_account_otp_cooldown`,
	appConfig.otp.verifyEmail.cooldownPeriod,
);

export const redisVerifyAccountAttempts = new BaseRedisCache<string, number>(
	(email) => `users:${email}:verify_account_otp_attempts`,
	appConfig.otp.verifyEmail.attemptsExpiration,
);

export const redisVerifyAccountFailedAttempts = new BaseRedisCache<string, number>(
	(email) => `users:${email}:verify_account_failed_attempts`,
	appConfig.otp.verifyEmail.expiresIn, // same OTP expiration
);

export const setRedisVerifyAccount = async (email: string, otp: string) => {
	await redisVerifyAccountOtp.set(email, otp);
	await redisVerifyAccountCooldown.set(email, true);

	const attempts = await redisVerifyAccountAttempts.incr(email);
	if (attempts === 1) {
		await redisVerifyAccountAttempts.expire(email, appConfig.otp.verifyEmail.attemptsExpiration || 3600);
	}
};
