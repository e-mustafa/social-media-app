import { Request } from 'express';
import { TokenPayload } from 'google-auth-library';
import { URL } from 'node:url';
import { appConfig, frontendUrls } from '../../config/app.config';
import { ENV } from '../../config/env.config';
import emailEvents from '../../utils/events/email.events';
import { redisRefreshToken } from '../../utils/redis/refresh-token.redis';
import { redisResetPasswordToken } from '../../utils/redis/reset-password-token.redis';
import {
	redisVerifyAccountAttempts,
	redisVerifyAccountCooldown,
	redisVerifyAccountFailedAttempts,
	redisVerifyAccountOtp,
	setRedisVerifyAccount,
} from '../../utils/redis/verify-account-otp.redis';
import {
	BadRequestException,
	ConflictException,
	InternalException,
	ManyRequestsException,
	NotFoundException,
	UnAuthorizedException,
	ValidationErrorsException,
} from '../../utils/response/exception.response';
import { generateHash, verifyHash } from '../../utils/security/hash.security';
import { generateOtp, generateRandomToken, hashOtp, hashToken, verifyOtp } from '../../utils/security/otp-and-token';
import { verifyOAuth2Google } from '../../utils/security/token/providers/google.token';
import { decodeToken, generateTokens, TTokens } from '../../utils/security/token/token';
import { ProviderEnum, TProvider } from '../user/user.enums';
import User, { UserHDocument } from '../user/user.model';
import { ISessionInfo } from '../user/user.types';
import { ILoginDTO, IRegisterDTO } from './auth.validation';

class AuthServices {
	constructor() {}

	/**
	 * Registers a new user account, generates an initial OTP, and emits a verification email event.
	 */
	async register({ firstName, lastName, username, email, password, confirmPassword }: IRegisterDTO): Promise<boolean> {
		// 1. Check if the email is already registered
		const existEmail = await User.findOne({ email }).select('email');
		if (existEmail) {
			throw new ConflictException('This email is already registered', 'Email-exists_register', {
				body: { email: 'This email is already registered' },
			});
		}

		// 2. Validate password confirmation match
		if (password !== confirmPassword) {
			throw new ConflictException('Passwords mismatch', 'Passwords-do-not-match', {
				body: { confirmPassword: 'Passwords mismatch' },
			});
		}

		// 3. Create and automatically persist user to DB
		const user: UserHDocument = await User.create({
			firstName,
			lastName,
			username,
			email,
			password: await generateHash(password, undefined, true),
		});

		// 4. Generate OTP and initialize Redis entries (OTP, Cooldown, Attempts)
		const otp = generateOtp();
		await setRedisVerifyAccount(user.email, hashOtp(otp));

		// 5. Dispatch account verification email event
		emailEvents.emit('verify-account', user.email, user.firstName || '', otp);

		return true;
	}

	/**
	 * Resend a new OTP to the user's email if cooldown and attempt limits are respected.
	 */
	async resendOtp(email: string): Promise<boolean> {
		// 1. Fetch user (Silent return if not found to prevent user enumeration attacks)
		const user = await User.findOne({ email }).lean().select('email firstName');
		if (!user) {
			return true;
		}
		const userEmail = user.email;

		// 2. Check if active cooldown period exists
		const isCooldown = await redisVerifyAccountCooldown.exists(userEmail);
		if (isCooldown) {
			const remainingSeconds = await redisVerifyAccountCooldown.ttl(userEmail);

			throw new ManyRequestsException(
				'OTP is still valid, please wait before requesting a new one',
				'OTP_STILL_VALID_resendOtp',
				remainingSeconds,
			);
		}

		// 3. Verify max allowed resend attempts
		const currentAttempts = (await redisVerifyAccountAttempts.get(userEmail)) || 0;
		const maxAttempts = appConfig.otp.verifyEmail.sendAttempts || 3;

		if (Number(currentAttempts) >= maxAttempts) {
			// 🌟 جلب الوقت المتبقي لانتهاء الحظر الساعي (Hourly Block)
			const remainingSeconds = await redisVerifyAccountAttempts.ttl(userEmail);

			throw new ManyRequestsException(
				'Maximum OTP requests reached. Try again later.',
				'MAX_OTP_REACHED_resendOtp',
				remainingSeconds,
			);
		}

		// 4. Generate new OTP and refresh Redis states
		const otp = generateOtp();
		await setRedisVerifyAccount(userEmail, hashOtp(otp));

		// 5. Dispatch email event
		emailEvents.emit('verify-account', userEmail, user.firstName || '', otp);

		return true;
	}

	/**
	 * Verifies the submitted OTP against stored Redis hash and activates user account.
	 */
	async verifyAccount(email: string, otp: string | number): Promise<boolean> {
		// 1. Validate user existence
		const user = await User.findOne({ email });
		if (!user) {
			throw new ConflictException('User not found', 'User-not-found_verifyAccount');
		}

		// 2. Prevent re-verification of already verified users
		if (user.verifiedAt) {
			throw new BadRequestException('User already verified', 'User-already-verified_verifyAccount');
		}

		const userEmail = user.email;

		// 3. Check if user exceeded maximum failed verification guesses
		const failedAttemptsCount = (await redisVerifyAccountFailedAttempts.get(userEmail)) || 0;
		const maxFailedAllowed = appConfig.otp.verifyEmail.failedAttempts || 5;

		if (Number(failedAttemptsCount) >= maxFailedAllowed) {
			// Invalidate current OTP upon exceeding allowed failed guesses
			await redisVerifyAccountOtp.delete(userEmail);

			const remainingSeconds = await redisVerifyAccountFailedAttempts.ttl(userEmail);

			throw new ManyRequestsException(
				'Too many failed attempts. This OTP has been invalidated.',
				'MAX_FAILED_OTP_ATTEMPTS_verifyAccount',
				remainingSeconds,
			);
		}

		// 4. Retrieve hashed OTP from Redis
		const hashedOTP = await redisVerifyAccountOtp.get(userEmail);
		if (!hashedOTP) {
			throw new ValidationErrorsException(
				{ body: { otp: 'Invalid or expired OTP' } },
				'Invalid or expired OTP',
				'OTP-not-found_verifyAccount',
			);
		}

		// 5. Verify match between input OTP and stored hash
		const isValid = await verifyOtp(otp, hashedOTP);
		if (!isValid) {
			// increment failed attempts if invalid otp
			const newFailedCount = await redisVerifyAccountFailedAttempts.incr(userEmail);
			if (newFailedCount === 1) {
				await redisVerifyAccountFailedAttempts.expire(userEmail, appConfig.otp.verifyEmail.expiresIn || 300);
			}

			throw new ValidationErrorsException({ body: { otp: 'Invalid OTP' } }, 'Invalid OTP', 'Invalid-OTP_verifyAccount');
		}

		// 6. Update user verification timestamp
		const update = await User.updateOne({ _id: user._id }, { verifiedAt: new Date() });

		// 7. Purge all related Redis keys after successful verification
		await Promise.all([
			redisVerifyAccountOtp.delete(userEmail),
			redisVerifyAccountAttempts.delete(userEmail),
			redisVerifyAccountCooldown.delete(userEmail),
			redisVerifyAccountFailedAttempts.delete(userEmail),
		]);

		return update.modifiedCount > 0;
	}

	async login(req: Request, { email, password, rememberMe = false }: ILoginDTO): Promise<TTokens> {
		const user = await User.findOne({ email });
		if (!user) {
			throw new NotFoundException('Invalid Credentials', 'User-not-found_login');
		}

		if (!(await verifyHash(password, user.password!, true))) {
			throw new BadRequestException('Invalid Credentials', 'Invalid-password_login');
		}

		const tokens = generateTokens(user, rememberMe);

		const sessionInfo: ISessionInfo = {
			ip: req.ip,
			device: req.get('User-Agent'),
			createdAt: new Date(),
		};

		// save refresh token id in redis to be able to revoke it later
		await redisRefreshToken.set([user._id, tokens.tokenId!], sessionInfo);

		return tokens;
	}

	async refreshAccessToken(req: Request, authorization: string): Promise<TTokens> {
		// verify refresh token
		const payload = decodeToken(authorization, true);
		if (!payload || !payload.id || !payload.jti) {
			throw new NotFoundException('Invalid refresh token', 'Invalid-refresh-token_refreshAccessToken');
		}

		// check if refresh token id exists in redis (not expired or revoked)
		const isTokenIdExists = await redisRefreshToken.get([payload.id, payload.jti]);
		if (!isTokenIdExists) {
			throw new NotFoundException(
				'Refresh token is invalid or has been revoked, please login again.',
				'Refresh-token-invalid_refreshAccessToken',
			);
		}

		//
		const user = await User.findById(payload.id);
		if (!user) {
			throw new NotFoundException(
				'User associated with this token no longer exists.',
				'User-not-found_refreshAccessToken',
			);
		}

		if (user.loggedOutAllAt) {
			const tokenIssuedAt = payload.iat || 0 * 1000;
			// const globalTime = user.loggedOutAllAt.getTime()
			if (tokenIssuedAt < user.loggedOutAllAt.getTime()) {
				throw new UnAuthorizedException(
					'You have logged out all devices, please login again.',
					'User-logged-out-all-devices_refreshAccessToken',
				);
			}
		}

		// delete old refresh token id from redis
		await redisRefreshToken.delete([payload.id, payload.jti]);

		// generate access and refresh tokens with the same rememberMe value
		const tokens = generateTokens(user, payload.remembered || false);

		const sessionInfo: ISessionInfo = {
			ip: req.ip,
			device: req.get('User-Agent'),
			createdAt: new Date(),
		};

		// save new refresh token id to redis
		await redisRefreshToken.set([user._id.toString(), tokens.tokenId || ''], sessionInfo, tokens.refreshExpiration);

		return tokens;
	}

	async socialLogin_google(provider: TProvider, idToken: string): Promise<{ isNew: boolean; tokens: TTokens }> {
		if (!provider || !Object.values(ProviderEnum).includes(provider)) {
			throw new InternalException('Invalid provider', 'Invalid-provider_socialLogin_google');
		}

		let payload: TokenPayload | undefined;
		if (provider === ProviderEnum.GOOGLE) {
			payload = await verifyOAuth2Google(idToken);
		}
		if (!payload) {
			throw new BadRequestException('Invalid id token', 'Invalid-id-token_socialLogin_google');
		}

		const { email_verified, email, given_name, family_name, picture } = payload || {};

		if (!email_verified || !email) {
			throw new BadRequestException('Email not verified, Use another account', 'email-not-verified_socialLogin_google');
		}

		const isExists = await User.findOne({ email });

		if (isExists && isExists.provider !== provider) {
			if (isExists.provider === ProviderEnum.SYSTEM) {
				throw new BadRequestException(
					'Email already exists with password, please login with password',
					'email-already-exists_socialLogin_google',
				);
			} else {
				throw new BadRequestException(
					'Email already exists with another provider',
					'email-exists-other-provider_socialLogin_google',
				);
			}
		}

		// login exist user
		if (isExists) {
			const tokens = generateTokens(isExists, false);
			return { isNew: false, tokens };
		}

		// create new user
		const newUser: UserHDocument = await User.create({
			email,
			firstName: given_name || email.split('@')[0]!,
			lastName: family_name || email.split('@')[0] || 'AA',
			avatar: picture ? { id: 'google-picture', url: picture } : undefined,
			provider,
		});

		const tokens = generateTokens(newUser, false);
		return { isNew: true, tokens };
	}

	async forgetPassword(email: string) {
		const user = await User.findOne({ email });
		if (!user) {
			throw new NotFoundException('This Email is not registered', 'User-not-found_forgetPassword');
		}

		// create and hash reset token
		const resetToken = generateRandomToken(64);
		const hashedResetToken = hashToken(resetToken);

		// save hashed reset token to redis
		await redisResetPasswordToken.set(hashedResetToken, user._id);

		// create reset password link
		const url = new URL(`${ENV.frontendUrl}${frontendUrls.resetPassword}`);
		url.searchParams.set('token', resetToken);
		const resetUrl = url.href;

		// send reset password email
		emailEvents.emit('reset-password', email, user.firstName, resetUrl);
	}

	async resetPassword(token: string, password: string, confirmPassword: string) {
		if (password !== confirmPassword) {
			throw new ConflictException('Passwords mismatch', 'Passwords-do-not-match_resetPassword', {
				body: { confirmPassword: 'Passwords mismatch' },
			});
		}

		const hashedToken = hashToken(token);
		const userId = await redisResetPasswordToken.get(hashedToken);
		if (!userId) {
			throw new NotFoundException('Invalid or expired token', 'Invalid-or-expired-token_resetPassword');
		}

		// update user with new password
		const user = await User.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found', 'User-not-found_resetPassword');
		}

		user.password = await generateHash(password);

		// add loggedOutAllAt query if it enabled in settings -> (resetPassword_logoutAll = true)
		if (appConfig.auth.resetPassword_logoutAll) {
			user.loggedOutAllAt = new Date();
		}

		await user.save();

		// delete reset password token from redis
		await redisResetPasswordToken.delete(hashedToken);

		if (appConfig.auth.resetPassword_logoutAll) {
			// logout all sessions
			await redisRefreshToken.deletePattern(userId);
		}

		return true;
	}
}

export default new AuthServices();
