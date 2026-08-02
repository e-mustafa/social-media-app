import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { ENV } from '../../config/env.config';

export const generateOtp = () => {
	return randomInt(100000, 999999).toString();
};

export const generateRandomToken = (length: number = 32) => {
	return randomBytes(length)?.toString('hex');
};

// Hash token using SHA-256 (fast for long text)
export const hashToken = (token: string): string => {
	return createHash('sha256').update(token).digest('hex');
};

// Hash OTP using HMAC-SHA256 with encryption key (for short values like OTP)
export const hashOtp = (otp: string | number): string => {
	const secret = ENV.security.encKey || 'your-fallback-secret';
	return createHmac('sha256', secret).update(String(otp)).digest('hex');
};

export const verifyOtp = (inputOtp: string | number, storedHashedOtp: string): boolean => {
	try {
		// hash plain otp
		const inputHashedOtp = hashOtp(String(inputOtp));

		// convert hashes to buffers
		const a = Buffer.from(inputHashedOtp, 'hex');
		const b = Buffer.from(storedHashedOtp, 'hex');

		// buffers must have the same length
		if (a.length !== b.length) {
			return false;
		}

		// timing safe comparison -> prevent timing attacks
		return timingSafeEqual(a, b);
	} catch (error) {
		return false;
	}
};
