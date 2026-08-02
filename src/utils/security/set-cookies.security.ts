import { CookieOptions, Response } from 'express';
import { ENVjwtSignatureLevel } from '../../config/env.config';
import { CookiesKeysEnum } from './enum.security';
import { TTokens } from './token/token';

export function setCookies(res: Response, data: TTokens) {
	if (!res || !data) return;
	const options: CookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' };

	// set access token in cookie
	if (data.accessToken) {
		res.cookie(CookiesKeysEnum.accessToken, `Bearer ${data?.accessToken}`, {
			...options,
			maxAge:
				Number(data?.accessExpiration) * 1000 || Number(ENVjwtSignatureLevel.user.accessTokenExpires) || 1000 * 60 * 15, // 15 minutes if not provided
		});
	}

	// set refresh token in cookie
	if (data.refreshToken) {
		res.cookie(CookiesKeysEnum.refreshToken, `Bearer ${data?.refreshToken}`, {
			...options,
			maxAge: Number(data?.refreshExpiration) * 1000 || Number(ENVjwtSignatureLevel.user.refreshTokenExpires), // exp dependent on rememberMe
		});
	}
}
