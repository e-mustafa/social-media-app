import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import { paramsIdSchema, querySchema } from '../../shared/validation/general-fields.validation';
import {} from './message.controller';

const router = Router();

export const routes = {
	base: '/messages',

	getFriends: '/',
	getReceivedRequests: '/received',
	getSentRequests: '/sent',

	sendRequest: '/request/:id',
	deleteRequest: '/request/:id',
	acceptRequest: '/request/accept/:id',
	rejectRequest: '/request/reject/:id',
};
// PATCH  /friends/requests/:userId/accept
// PATCH  /friends/requests/:userId/reject

// apply auth middleware for all routes in this router
router.use(auth());

// router.get(routes.getFriends, validation(querySchema), getMyFriends);
// router.get(routes.getReceivedRequests, validation(querySchema), getReceivedRequests);
// router.get(routes.getSentRequests, validation(querySchema), getSentRequests);

// router.post(routes.sendRequest, validation(paramsIdSchema), sendFriendRequest);
// router.delete(routes.sendRequest, validation(paramsIdSchema), deleteFriendRequest);

// router.patch(routes.acceptRequest, validation(paramsIdSchema), acceptFriendRequest);
// router.patch(routes.rejectRequest, validation(paramsIdSchema), rejectFriendRequest);

export default router;
