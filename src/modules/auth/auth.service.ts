import { Request } from 'express';
import { TokenPayload } from 'google-auth-library';
import { URL } from 'node:url';
import { appConfig, frontendUrls } from '../../config/app.config';
import { ENV } from '../../config/env.config';
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	InternalException,
	ManyRequestsException,
	NotFoundException,
	UnAuthorizedException,
	ValidationErrorsException,
} from '../../shared/response/exception.response';
import { Id } from '../../shared/types';
import emailEvents from '../../utils/events/email.events';
import { reactiveAccountServices } from '../../utils/redis/reactivate-account-otp-service.redis';
import { redisRefreshToken } from '../../utils/redis/refresh-token.redis';
import { redisResetPasswordToken } from '../../utils/redis/reset-password-token.redis';
import {
	redisVerifyAccountAttempts,
	redisVerifyAccountCooldown,
	redisVerifyAccountFailedAttempts,
	redisVerifyAccountOtp,
	setRedisVerifyAccount,
} from '../../utils/redis/verify-account-otp.redis';
import { verifyHash } from '../../utils/security/hash.security';
import { generateOtp, generateRandomToken, hashOtp, hashToken, verifyOtp } from '../../utils/security/otp-and-token';
import { verifyOAuth2Google } from '../../utils/security/token/providers/google.token';
import { decodeToken, generateTokens } from '../../utils/security/token/token';
import { TTokens } from '../../utils/security/token/token.types';
import { ProviderEnum, StatusReasonEnum, TProvider, UserStatusEnum } from '../user/user.enums';
import { UserRepository } from '../user/user.repository';
import { ISessionInfo, ISessionResponse, IUser, IUserDocument } from '../user/user.types';
import { IChangePasswordDTO, ILoginDTO, IRegisterDTO, IResetPasswordDTO } from './auth.validation';

// Define structured return types for login service
export type TLoginSuccess = TTokens & {
	requiresReactivation?: false;
};

export type TLoginReactivationRequired = {
	requiresReactivation: true;
	reactivationToken: string;
};

export type TLoginResult = TLoginSuccess | TLoginReactivationRequired;

const selectUserInfo = 'firstName lastName email phone username bio gender avatar cover role';

class AuthServices {
	private readonly userRepo: UserRepository;
	constructor(userRepo: UserRepository) {
		this.userRepo = userRepo || new UserRepository();
	}

	async checkUsername(username: string): Promise<boolean> {
		const existUsername = await this.userRepo.findOne({ username }).select('username').exec();
		if (existUsername) throw new ValidationErrorsException({ body: { username: 'Username already taken' } });
		return true;
	}

	/**
	 * Registers a new user account, generates an initial OTP, and emits a verification email event.
	 */
	async register({ firstName, lastName, username, email, password, confirmPassword }: IRegisterDTO): Promise<boolean> {
		// 1. Check if the email is already registered
		// const existEmail = await User.findOne({ email }).select('email');
		const existEmail = await this.userRepo.findByEmail(email).select('email').exec();
		console.log('existEmail', existEmail);
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
		// const user: IUserDocument = await User.create({
		const user = await this.userRepo.create({
			firstName,
			lastName,
			username,
			email,
			password, //: await generateHash(password, undefined, true), move to mongoose pre hooks
		});

		// 4. Generate OTP and initialize Redis entries (OTP, Cooldown, Attempts)
		const otp = generateOtp();
		await setRedisVerifyAccount(user.email, hashOtp(otp));

		// 5. Dispatch account verification email event
		emailEvents.emitAsync('verify-account', { email: user.email, name: user.firstName || '', otp });

		return true;
	}

	/**
	 * Resend a new OTP to the user's email if cooldown and attempt limits are respected.
	 */
	async resendOtp(email: string): Promise<boolean> {
		// 1. Fetch user (Silent return if not found to prevent user enumeration attacks)
		const user = await this.userRepo.findByEmail(email).select('email firstName').lean().exec();
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
		emailEvents.emitAsync('verify-account', { email: userEmail, name: user.firstName || '', otp });

		return true;
	}

	/**
	 * Verifies the submitted OTP against stored Redis hash and activates user account.
	 */
	async verifyAccount(email: string, otp: string | number): Promise<boolean> {
		// 1. Validate user existence
		const user = await this.userRepo.findByEmail(email).exec();
		if (!user) {
			throw new ConflictException('User not found', 'User-not-found_verifyAccount');
		}

		// 2. Prevent re-verification of already verified users
		if (user.verifiedAt) {
			throw new BadRequestException('User already verified', 'User-already-verified_verifyAccount');
		}

		const userEmail: string = user.email;

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
		// const update = await User.updateOne({ _id: user._id }, { verifiedAt: new Date() });
		const update = await this.userRepo.updateOne({ _id: user._id }, { verifiedAt: new Date() });

		// 7. Purge all related Redis keys after successful verification
		await Promise.all([
			redisVerifyAccountOtp.delete(userEmail),
			redisVerifyAccountAttempts.delete(userEmail),
			redisVerifyAccountCooldown.delete(userEmail),
			redisVerifyAccountFailedAttempts.delete(userEmail),
		]);

		return update.modifiedCount > 0;
	}

	public async login(req: Request, { email, password, rememberMe = false }: ILoginDTO): Promise<TLoginResult> {
		const user = await this.userRepo.findByEmail(email, { ignoreDefaultFilters: true }).exec();

		if (!user) {
			throw new NotFoundException('Invalid Credentials', 'User-not-found_login');
		}

		if (!(await verifyHash(password, user.password!, true))) {
			throw new BadRequestException('Invalid Credentials', 'Invalid-password_login');
		}

		// Handle Account Deletion State - Throw Exception instead of returning object
		if (user.status === UserStatusEnum.DELETING) {
			throw new ForbiddenException('Account is scheduled for deletion', 'Account-deleting_login');
		}

		// Handle Deactivated Account Status
		if (user.status === UserStatusEnum.INACTIVE) {
			const reactivationToken = generateRandomToken();
			await reactiveAccountServices.set(user.id, hashToken(reactivationToken));

			return {
				requiresReactivation: true,
				reactivationToken,
			};
		}

		const tokens = generateTokens(user, rememberMe);

		const sessionInfo: ISessionInfo = {
			ip: req.ip || 'Unknown',
			device: req.get('User-Agent') || 'Unknown Device',
			createdAt: new Date().toISOString(),
		};

		// Store refresh token with dynamic expiration calculated from rememberMe flag
		await redisRefreshToken.set([user._id.toString(), tokens.tokenId!], sessionInfo, tokens.refreshExpiration);

		return tokens;
	}

	public async refreshAccessToken(req: Request, authorization: string): Promise<TTokens> {
		const payload = decodeToken(authorization, true);
		if (!payload || !payload.id || !payload.jti) {
			throw new NotFoundException('Invalid refresh token', 'Invalid-refresh-token_refreshAccessToken');
		}

		// Check if refresh token session exists in Redis
		const existingSession = await redisRefreshToken.get([payload.id, payload.jti]);
		if (!existingSession) {
			throw new NotFoundException(
				'Refresh token is invalid or has been revoked, please login again.',
				'Refresh-token-invalid_refreshAccessToken',
			);
		}

		const user = await this.userRepo.findById(payload.id).exec();
		if (!user) {
			throw new NotFoundException(
				'User associated with this token no longer exists.',
				'User-not-found_refreshAccessToken',
			);
		}

		// Validate token issuance timestamp against global logout timestamp
		if (user.loggedOutAllAt) {
			const tokenIssuedAtMs = (payload.iat ?? 0) * 1000;
			if (tokenIssuedAtMs < user.loggedOutAllAt.getTime()) {
				throw new UnAuthorizedException(
					'You have logged out all devices, please login again.',
					'User-logged-out-all-devices_refreshAccessToken',
				);
			}
		}

		// Delete old refresh token from Redis
		await redisRefreshToken.delete([payload.id, payload.jti]);

		// Issue new token pair retaining the remembered session state
		const tokens = generateTokens(user, !!payload.remembered);

		// Preserve original session start time while updating network metadata if needed
		const updatedSessionInfo: ISessionInfo = {
			ip: req.ip || existingSession.ip || 'Unknown',
			device: req.get('User-Agent') || existingSession.device || 'Unknown Device',
			createdAt: existingSession.createdAt || new Date().toISOString(),
		};

		// Save rotated refresh token session to Redis
		await redisRefreshToken.set([user._id.toString(), tokens.tokenId || ''], updatedSessionInfo, tokens.refreshExpiration);

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

		const isExists = await this.userRepo.findByEmail(email).exec();

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
		const newUser: IUserDocument = await this.userRepo.create({
			email,
			firstName: given_name || email.split('@')[0]!,
			lastName: family_name || email.split('@')[0] || 'AA',
			avatar: picture ? { id: 'google-picture', url: picture } : null,
			provider,
		});

		const tokens = generateTokens(newUser, false);
		return { isNew: true, tokens };
	}

	async forgetPassword(email: string) {
		const user = await this.userRepo.findByEmail(email).exec();
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
		emailEvents.emitAsync('reset-password', { email, name: user.firstName || '', resetLink: resetUrl });
	}

	async resetPassword({ token, password, confirmPassword }: IResetPasswordDTO) {
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
		const user = await this.userRepo.findById(userId).exec();
		if (!user) {
			throw new NotFoundException('User not found', 'User-not-found_resetPassword');
		}

		user.password = password; // hash password handling in schema pre save

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

	async logout(refreshToken: string): Promise<boolean> {
		const payload = decodeToken(refreshToken, true);
		if (!payload || !payload.id || !payload.jti) {
			throw new NotFoundException('Invalid refresh token', 'logout');
		}
		// delete old refresh token id from redis
		await redisRefreshToken.delete([payload.id, payload.jti]);

		return true;
	}

	async logoutAll(refreshToken: string): Promise<boolean> {
		const payload = decodeToken(refreshToken, true);
		if (!payload || !payload.id || !payload.jti) {
			throw new NotFoundException('Invalid refresh token', 'logoutAll');
		}

		// 1. Delete all user session keys from Redis
		await redisRefreshToken.deletePattern(payload.id);

		// 2. Set global logout timestamp in DB for extra security layer
		await this.userRepo.updateOne({ _id: payload.id }, { loggedOutAllAt: new Date() });

		return true;
	}

	async changePassword(
		userId: Id,
		{ currentPassword, newPassword, confirmNewPassword }: IChangePasswordDTO,
	): Promise<boolean> {
		if (newPassword === currentPassword) {
			throw new BadRequestException('New password cannot be the same as current password', 'changePassword');
		}
		if (newPassword !== confirmNewPassword) {
			throw new BadRequestException('New password and confirm password do not match', 'changePassword');
		}

		const user = await this.userRepo.findById(userId).exec();
		if (!user) {
			throw new NotFoundException('User not found', 'changePassword');
		}

		console.log({ currentPassword, user: user.password });

		const isPasswordValid = await verifyHash(currentPassword, user.password || '', true);
		if (!isPasswordValid) {
			throw new BadRequestException('Current password is incorrect', 'changePassword');
		}

		user.password = newPassword; // hash password handling in schema pre save

		// add loggedOutAllAt query if it enabled in settings -> (changePassword_logoutAll = true)
		if (appConfig.auth.changePassword_logoutAll) {
			user.loggedOutAllAt = new Date();
		}

		await user.save();

		if (appConfig.auth.changePassword_logoutAll) {
			// logout all sessions
			await redisRefreshToken.deletePattern(userId);
		}

		return true;
	}

	async getThisSession(userId: Id, refreshToken: string): Promise<ISessionResponse> {
		const payload = decodeToken(refreshToken, true);
		if (!payload || !payload.id || !payload.jti) {
			throw new NotFoundException('Invalid refresh token', 'getSessions');
		}
		const session = await redisRefreshToken.get([payload.id, payload.jti]);
		console.log('session', session);
		if (!session) {
			throw new NotFoundException('Session not found', 'getSessions');
		}
		return { ...session, active: true } as ISessionResponse;
	}

	public async getMySessions(userId: Id, refreshToken: string): Promise<ISessionResponse[]> {
		const payload = decodeToken(refreshToken, true);
		if (!payload || !payload.id || !payload.jti) {
			throw new NotFoundException('Invalid refresh token', 'getSessions');
		}

		// Fetch all user session entries along with their keys from Redis
		const sessionsWithKeys = await redisRefreshToken.getByPatternWithKeys(payload.id);

		return sessionsWithKeys.map(({ key, value }) => {
			// Extract JTI from Redis key structure "users:refresh_tokens:{userId}:{jti}"
			const keyParts = key.split(':');
			const sessionJti = keyParts[keyParts.length - 1];

			return {
				...value,
				id: sessionJti,
				active: sessionJti === payload.jti,
			};
		});
	}

	async removeSession(refreshToken: string, sessionId: string): Promise<boolean> {
		const payload = decodeToken(refreshToken, true);
		if (!payload || !payload.id || !payload.jti) {
			throw new NotFoundException('Invalid refresh token', 'removeSession');
		}

		// delete session from redis
		await redisRefreshToken.delete([payload.id, sessionId]);

		if (sessionId === payload.jti) {
			return true;
		}

		await this.logoutAll(refreshToken);
		return false;
	}

	// Active/Inactive Account status -------------------------------------------------
	async deactivateMyAccount(userId: Id, refreshToken: string): Promise<IUser> {
		const myUser = await this.userRepo.findOne({ _id: userId }, { ignoreDefaultFilters: true }).lean().exec();
		if (!myUser || myUser?.deletedAt) {
			throw new NotFoundException('User not found', 'Deactivate-my-account');
		}

		if (myUser.status === UserStatusEnum.INACTIVE) {
			throw new BadRequestException('Account is already inactive', 'Deactivate-my-account');
		}

		const updated = await this.userRepo
			.findByIdAndUpdate(
				userId,
				{
					status: UserStatusEnum.INACTIVE,
					statusChangedAt: new Date(),
					statusReason: StatusReasonEnum.USER_REQUEST,
				},
				{ ignoreDefaultFilters: true },
			)
			.select(selectUserInfo)
			.lean()
			.exec();
		if (!updated) {
			throw new BadRequestException('failed to deactivate account', 'Deactivate-my-account');
		}

		await this.logoutAll(refreshToken);

		return updated;
	}

	async reactivateMyAccount(req: Request, email: string, token: string): Promise<TTokens> {
		const user = await this.userRepo.findByEmail(email, { ignoreDefaultFilters: true }).exec();

		if (!user || user?.deletedAt) {
			throw new NotFoundException('User not found', 'Deactivate-my-account');
		}

		if (user.status === UserStatusEnum.ACTIVE) {
			throw new BadRequestException('Account is already active', 'Deactivate-my-account');
		}

		const hashedToken = await reactiveAccountServices.get(user._id);

		console.log('hashedToken', hashedToken);
		console.log('hashToken(hashedToken)', hashToken(token));

		if (!hashedToken || hashToken(token) !== hashedToken) {
			throw new BadRequestException('Invalid or expired token', 'expireToken_reactivateMyAccount');
		}

		// Update status to active
		const updated = await this.userRepo
			.findByIdAndUpdate(
				user._id,
				{
					status: UserStatusEnum.ACTIVE,
					statusChangedAt: new Date(),
					$unset: { statusReason: '' }, // Completely removes the field from MongoDB document
				},
				{ ignoreDefaultFilters: true },
			)
			.select(selectUserInfo)
			.lean()
			.exec();

		if (!updated) {
			throw new BadRequestException('failed to activate account', 'Activate-my-account');
		}

		// delete reactivation token from redis
		await reactiveAccountServices.delete(user._id);

		// Issue authentication tokens for immediate login
		const tokens = generateTokens(user);

		const sessionInfo: ISessionInfo = {
			ip: req.ip || 'Unknown',
			device: req.get('User-Agent') || 'Unknown Device',
			createdAt: new Date().toISOString(),
		};

		// Store refresh token with dynamic expiration calculated from rememberMe flag
		await redisRefreshToken.set([user._id.toString(), tokens.tokenId!], sessionInfo, tokens.refreshExpiration);

		return tokens;
	}
}

export default new AuthServices(new UserRepository());
