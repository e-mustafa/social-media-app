import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import { querySchema } from '../../shared/validation/general-fields.validation';
import { paramsIdSchema } from '../user/user.validation';
import * as controller from './notification.controller';

const router = Router();

export const routes = {
	base: '/block',

	getBlockUsers: '/',
	blockUser: '/:userId',
	unblockUser: '/:userId',
};

// apply auth middleware for all routes in this router
router.use(auth());

// Block -------------------------------------------------
router.get(routes.getBlockUsers, validation(querySchema), controller.getBlockUsers);
router.post(routes.blockUser, validation(paramsIdSchema), controller.blockUser);
router.delete(routes.unblockUser, validation(paramsIdSchema), controller.unblockUser);

export default router;
