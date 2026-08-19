import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { ENV, ENVjwtSignatureLevel } from '../../../config/env.config';
import { AdminRoleEnum, RoleEnum, TAdminRole, TRole } from '../../../modules/user/user.enums';
import { InternalException, UnAuthorizedException } from '../../../shared/response/exception.response';
import { TokenTypeEnum } from '../enum.security';
import { IJwtPayload, IUserPayload, TTokens } from './token.types';

// export const generateToken = (payload: JwtPayload, secretKey: Secret, options: SignOptions) => {
export const generateToken = (payload: string | Buffer | object, secretKey: Secret, options: SignOptions) => {
	if (!secretKey) {
		throw new InternalException('JWT Secret key is missing or undefined.', 'SecretKeyMissing_generateToken');
	}
	const appOptions = {
		// algorithm: 'HS256',
		issuer: ENV.appName,
		subject: 'User Authentication',
		audience: String(options.audience ?? RoleEnum.USER),
		...options,
	};
	return jwt.sign(payload, secretKey, appOptions);
};

export const verifyToken = (token: string, secretKey: string) => {
	if (!secretKey) {
		throw new InternalException('JWT Secret key is missing or undefined.', 'SecretKeyMissing_generateToken');
	}
	return jwt.verify(token, secretKey);
};

export const getSignature = (userRole: TRole | string) => {
	const role = Number(userRole);
	let signature;
	if (Object.values(AdminRoleEnum)?.includes(role as TAdminRole)) {
		signature = ENVjwtSignatureLevel.admin;
	} else if (role === RoleEnum.USER) {
		signature = ENVjwtSignatureLevel.user;
	} else {
		throw new InternalException('Invalid token Signature', 'getSignature');
	}
	return signature;
};

/**
 * Generate access or/and refresh tokens for a user
 * @param {Object} user - User data object, *Must have _id and role properties
 * @param {string} type - Token type (default BOTH, "ACCESS" for access only, "REFRESH" for refresh only)
 * @param {Object} customPayload - Custom payload to include in the token, Default payload is { id, email, role }
 * @returns {Object} - Object containing accessToken and refreshToken
 */
export const generateTokens = (
	// user: Partial<IUser>,
	user: IUserPayload,
	rememberMe: boolean = false,
	type: 'BOTH' | 'ACCESS' | 'REFRESH' = 'BOTH',
	customPayload: Record<string, unknown> = {},
) => {
	if (!user || user.role === undefined) {
		user.role = RoleEnum.USER;
		// throw new InternalException('Token generation failed: User role is missing or undefined', 'generateTokens');
	}

	const signature = getSignature(user.role);
	if (!signature) {
		throw new InternalException('Unauthorized or Invalid role', 'generateTokens');
	}
	const payload: IJwtPayload = {
		id: user._id,
		_id: user._id,
		email: user.email,
		name: user.firstName,
		remembered: rememberMe ? 1 : 0,
		// role: Number(user.role),
		// firstName: user.firstName,
		// lastName: user.lastName,
		// avatar: user.avatar,
		...customPayload,
	};

	const tokens: TTokens = {
		accessToken: '',
		refreshToken: '',
		accessExpiration: 0,
		refreshExpiration: 0,
	};

	if (type === 'BOTH' || type === TokenTypeEnum.ACCESS) {
		tokens.accessExpiration = Number(signature.accessTokenExpires);

		tokens.accessToken = generateToken(payload, signature.accessTokenSecret, {
			expiresIn: tokens.accessExpiration,
			audience: String(user.role),
		});
	}

	if (type === 'BOTH' || type === TokenTypeEnum.REFRESH) {
		// create token id to use in refresh token for invalidation by (jwtid)
		tokens.tokenId = randomUUID();

		// calculate refresh token expiration -> if rememberMe is true, double the expiration time
		tokens.refreshExpiration = rememberMe
			? Number(signature.refreshTokenExpires) * 2
			: Number(signature.refreshTokenExpires);

		tokens.refreshToken = generateToken(payload, signature.refreshTokenSecret, {
			expiresIn: tokens.refreshExpiration,
			audience: String(user.role),
			jwtid: tokens.tokenId,
			// remembered: rememberMe,
		});
	}

	return tokens;
};

/**
 * Decodes a JWT token based on token audience (admin or user)
 * @param {string} authorization - The authorization header value (e.g., "Bearer <token>")
 * @param {boolean} isRefreshToken - Whether this is a refresh token (default: false)
 * @returns {Object} The decoded token payload
 * @throws {Error} If token is invalid or missing
 */
export const decodeToken = (authorization: string, isRefreshToken = false): IJwtPayload => {
	if (!authorization) {
		throw new InternalException('Authorization header is required', 'decodeToken');
	}
	const token = authorization?.startsWith('Bearer') ? authorization.split(' ')[1] : authorization;
	if (!token) {
		throw new InternalException('Token is required', 'decodeToken');
	}

	const decodedPayload = (jwt.decode(token) as JwtPayload) || {};

	if (!decodedPayload?.aud || !decodedPayload?.id) {
		throw new InternalException('Invalid token structure or corrupted payload, Please login again', 'decodeToken');
	}

	// Determine signature based on audience
	const signature = getSignature(decodedPayload.aud as string);

	// use try catch to handle token expiration exception
	// Verify token using the appropriate secret
	let decoded: IJwtPayload;
	try {
		decoded = verifyToken(
			token,
			isRefreshToken ? signature.refreshTokenSecret : signature.accessTokenSecret,
		) as IJwtPayload;
	} catch (error) {
		if (isRefreshToken) {
			throw new UnAuthorizedException(
				`${(error as Error).message || 'Token expired!'}, Please login again.`,
				'decodeToken',
			);
		} else {
			throw new UnAuthorizedException(
				`${(error as Error).message || 'Token expired!'}, Please ask for a new one`,
				'decodeToken',
			);
		}
	}
	// const user = await User.findById(decoded.id).select('-password -verified -otp').lean();
	return decoded;
};
