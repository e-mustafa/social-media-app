import { Request, Response } from 'express';
import { successResponse } from '../../utils/response/success.response';
import { setCookies } from '../../utils/security/set-cookies.security';
import { ProviderEnum } from '../user/user.enums';
import services from './auth.service';
import {
	IForgetPasswordDTO,
	ILoginDTO,
	IResendOtpODT,
	IResetPasswordDTO,
	ISocialGoogleDTO,
	IVerifyAccountDTO,
} from './auth.validation';

export const register = async (req: Request, res: Response) => {
	await services.register(req.body);
	successResponse({ res, message: 'Your account created successfully, please verify your account' });
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
	successResponse({ res, message: 'Login successfully', data });
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
		successResponse({ res, message: 'Account created successfully', data: tokens });
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
	await services.resetPassword(token, password, confirmPassword);
	successResponse({ res, message: 'Password reset successfully' });
};
