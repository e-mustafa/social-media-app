import { Router } from 'express';
import { validation } from '../../middlewares/validation.middleware';
import { registerSchema } from './auth.validation';

const router = Router();

export const routes = {
	base: '/auth',
	register: '/register',
	login: '/login',
	logout: '/logout',
	refresh: '/refresh',
	verify: '/verify',
	forgotPassword: '/forgot-password',
	resetPassword: '/reset-password',
};

router.post(routes.register, validation(registerSchema));

export default router;
