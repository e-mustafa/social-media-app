import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import {
	changePassword,
	checkUsername,
	deactivateMyAccount,
	forgetPassword,
	getMySessions,
	getThisSession,
	login,
	logout,
	logoutAll,
	reactivateMyAccount,
	refreshAccessToken,
	register,
	removeSession,
	resendOtp,
	resetPassword,
	socialLogin_google,
	verifyAccount,
} from './auth.controller';
import {
	changePasswordSchema,
	checkUsernameSchema,
	forgetPasswordSchema,
	loginSchema,
	reactivateAccountSchema,
	refreshAccessTokenSchema,
	registerSchema,
	resendOtpSchema,
	resetPasswordSchema,
	socialGoogleSchema,
	verifyAccountSchema,
} from './auth.validation';

const router = Router();

export const routes = {
	base: '/auth',
	checkUsername: '/check-username',
	register: '/register',
	resendOtp: '/verify-account/resend-otp',

	login: '/login',
	refreshToken: '/refresh-token',

	verifyAccount: '/verify-account',

	socialLogin_google: '/social-login/google',

	changePassword: '/change-password',

	forgotPassword: '/forgot-password',
	resetPassword: '/reset-password',

	// requestChangeEmail: '/request-change-email',
	// changeEmail: '/change-email',
	// revertEmail: '/revert-email',

	logout: '/logout',
	logoutAll: '/logout-all',

	// get sessions
	getSessions: '/sessions',
	getSession: '/session',

	removeSessions: '/sessions/:sessionId',

	deactivateMyAccount: '/deactivate',
	activateMyAccount: '/reactivate',
};

router.post(routes.checkUsername, validation(checkUsernameSchema), checkUsername);

router.post(routes.register, validation(registerSchema), register);
router.post(routes.resendOtp, validation(resendOtpSchema), resendOtp);
router.patch(routes.verifyAccount, validation(verifyAccountSchema), verifyAccount);

router.post(routes.login, validation(loginSchema), login);
router.patch(routes.refreshToken, validation(refreshAccessTokenSchema), refreshAccessToken);

router.post(routes.socialLogin_google, validation(socialGoogleSchema), socialLogin_google);

router.post(routes.forgotPassword, validation(forgetPasswordSchema), forgetPassword);
router.patch(routes.resetPassword, validation(resetPasswordSchema), resetPassword);

router.post(routes.logout, logout);
router.post(routes.logoutAll, logoutAll);

// sessions
router.get(routes.getSession, auth(), getThisSession);
router.get(routes.getSessions, auth(), getMySessions);
router.delete(routes.removeSessions, auth(), removeSession);

// change password
router.patch(routes.changePassword, auth(), validation(changePasswordSchema), changePassword);

// active/inactive Account -------------------------------------------------
router.patch(routes.deactivateMyAccount, auth(), validation(refreshAccessTokenSchema), deactivateMyAccount);
router.patch(routes.activateMyAccount, validation(reactivateAccountSchema), reactivateMyAccount);

export default router;
