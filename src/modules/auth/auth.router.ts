import { Router } from 'express';
import { validation } from '../../middlewares/validation.middleware';
import {
	forgetPassword,
	login,
	refreshAccessToken,
	register,
	resendOtp,
	resetPassword,
	socialLogin_google,
	verifyAccount,
} from './auth.controller';
import {
	loginSchema,
	refreshAccessTokenSchema,
	registerSchema,
	resendOtpSchema,
	socialGoogleSchema,
	verifyAccountSchema,
} from './auth.validation';

const router = Router();

export const routes = {
	base: '/auth',
	register: '/register',
	resendOtp: '/verify-account/resend-otp',

	login: '/login',
	refreshToken: '/refresh-token',

	verifyAccount: '/verify-account',

	socialLogin_google: '/social-login/google',

	forgotPassword: '/forgot-password',
	resetPassword: '/reset-password',

	// logout: '/logout',
};

import { forgetPasswordSchema, resetPasswordSchema } from './auth.validation';

router.post(routes.register, validation(registerSchema), register);
router.post(routes.resendOtp, validation(resendOtpSchema), resendOtp);
router.patch(routes.verifyAccount, validation(verifyAccountSchema), verifyAccount);
router.post(routes.login, validation(loginSchema), login);
router.patch(routes.refreshToken, validation(refreshAccessTokenSchema), refreshAccessToken);

router.post(routes.socialLogin_google, validation(socialGoogleSchema), socialLogin_google);

router.post(routes.forgotPassword, validation(forgetPasswordSchema), forgetPassword);
router.patch(routes.resetPassword, validation(resetPasswordSchema), resetPassword);

export default router;
