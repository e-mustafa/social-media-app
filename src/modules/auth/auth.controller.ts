import { Request, Response } from 'express';
import { appConfig } from '../../config/app.config';
import { successResponse } from '../../shared/response/success.response';
import { Id } from '../../shared/types';
import { removeCookiesTokens, setCookies } from '../../utils/security/set-cookies.security';
import { ProviderEnum } from '../user/user.enums';
import services from './auth.service';
import {
	IChangePasswordDTO,
	IForgetPasswordDTO,
	ILoginDTO,
	IReactivateAccount,
	IResendOtpODT,
	IResetPasswordDTO,
	ISocialGoogleDTO,
	IVerifyAccountDTO,
} from './auth.validation';

export const checkUsername = async (req: Request, res: Response) => {
	const available = await services.checkUsername(req.body.username);
	successResponse({ res, data: { available } });
};

export const register = async (req: Request, res: Response) => {
	await services.register(req.body);
	successResponse({ res, status: 201, message: 'Your account created successfully, please verify your account' });
};

export const resendOtp = async (req: Request, res: Response) => {
	const { email }: IResendOtpODT = req.body || {};
	await services.resendOtp(email);
	successResponse({ res, message: 'OTP sent successfully to your email, if you enter a valid email.' });
};

export const verifyAccount = async (req: Request, res: Response) => {
	const { email, otp }: IVerifyAccountDTO = req.body || {};
	await services.verifyAccount(email, otp);
	successResponse({ res, message: 'Account verified successfully' });
};

export const login = async (req: Request, res: Response) => {
	const { email, password, rememberMe }: ILoginDTO = req.body || {};
	const data = await services.login(req, { email, password, rememberMe });

	const message = data.requiresReactivation
		? 'Account is deactivated. Confirmation required to reactivate.'
		: 'Login successfully';

	successResponse({ res, message, data });
};

export const refreshAccessToken = async (req: Request, res: Response) => {
	const data = await services.refreshAccessToken(req, req.cookies.refreshToken || '');
	successResponse({ res, data });
};

export const socialLogin_google = async (req: Request, res: Response) => {
	const { idToken }: ISocialGoogleDTO = req.body || {};
	const { isNew, tokens } = await services.socialLogin_google(ProviderEnum.GOOGLE, idToken);
	setCookies(res, tokens);
	if (isNew) {
		successResponse({ res, status: 201, message: 'Account created successfully', data: tokens });
	} else {
		successResponse({ res, message: 'Login successfully', data: tokens });
	}
};

export const forgetPassword = async (req: Request, res: Response) => {
	const { email }: IForgetPasswordDTO = req.body || {};
	await services.forgetPassword(email);
	successResponse({ res, message: 'If email exists, we will send you a link to reset your password.' });
};

export const resetPassword = async (req: Request, res: Response) => {
	const { token, password, confirmPassword }: IResetPasswordDTO = req.body || {};
	await services.resetPassword({ token, password, confirmPassword });
	successResponse({ res, message: 'Password reset successfully' });
};

export async function changePassword(req: Request, res: Response) {
	const { currentPassword, newPassword, confirmNewPassword }: IChangePasswordDTO = req.body || {};
	const data = await services.changePassword(req.user?._id as Id, { currentPassword, newPassword, confirmNewPassword });

	if (data && appConfig.auth.changePassword_logoutAll) {
		// logout all sessions
		// remove cookies
		removeCookiesTokens(res);
	}

	successResponse({ res, message: 'Password changed successfully' });
}

// logout
export const logout = async (req: Request, res: Response) => {
	await services.logout(req.cookies.refreshToken);
	// remove cookies
	removeCookiesTokens(res);
	successResponse({ res, message: 'Logged out successfully' });
};

export const logoutAll = async (req: Request, res: Response) => {
	await services.logoutAll(req.cookies.refreshToken);
	// remove cookies
	removeCookiesTokens(res);
	successResponse({ res, message: 'Logged out from all sessions successfully' });
};

export const getThisSession = async (req: Request, res: Response) => {
	const data = await services.getThisSession(req.user?._id as Id, req.cookies.refreshToken);
	successResponse({ res, data });
};

export const getMySessions = async (req: Request, res: Response) => {
	const data = await services.getMySessions(req.user?._id as Id, req.cookies.refreshToken);
	successResponse({ res, data });
};

export const removeSession = async (req: Request, res: Response) => {
	const { sessionId } = req.params;
	const isLogout = await services.removeSession(req.cookies.refreshToken, sessionId as string);

	if (isLogout) {
		// remove cookies
		removeCookiesTokens(res);
	}
	successResponse({ res, message: 'Session removed successfully' });
};

export async function deactivateMyAccount(req: Request, res: Response) {
	const data = await services.deactivateMyAccount(req.user?._id as Id, req.cookies.refreshToken);
	// remove cookies
	removeCookiesTokens(res);
	successResponse({ res, message: 'Account deactivated successfully', data });
}

export async function reactivateMyAccount(req: Request, res: Response) {
	const { email, reactivationToken }: IReactivateAccount = req.body || {};
	const data = await services.reactivateMyAccount(req, email, reactivationToken);
	successResponse({ res, message: 'Account activated and login successfully.', data });
}
