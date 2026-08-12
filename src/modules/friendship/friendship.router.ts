import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import { paramsIdSchema, querySchema } from '../../utils/validation/general-fields.validation';
import {
	acceptFriendRequest,
	deleteFriendRequest,
	getReceivedRequests,
	getSentRequests,
	rejectFriendRequest,
	sendFriendRequest,
} from './friendship.controller';

const router = Router();

export const routes = {
	base: '/friendships',

	getReceivedRequests: '/', // GET /friendships/
	getSentRequests: '/sent', // GET /friendships/sent

	sendRequest: '/request/:id', // POST /friendships/requests/:id
	deleteRequest: '/request/:id', // POST /friendships/requests/:id
	acceptRequest: '/request/accept/:id', // PATCH /friendships/requests/accept/:id
	rejectRequest: '/request/reject/:id', // PATCH /friendships/requests/reject/:id
};

// apply auth middleware for all routes in this router
router.use(auth());

router.get(routes.getReceivedRequests, validation(querySchema), getReceivedRequests);
router.get(routes.getSentRequests, validation(querySchema), getSentRequests);

router.post(routes.sendRequest, validation(paramsIdSchema), sendFriendRequest);
router.delete(routes.sendRequest, validation(paramsIdSchema), deleteFriendRequest);

router.post(routes.acceptRequest, validation(paramsIdSchema), acceptFriendRequest);
router.patch(routes.rejectRequest, validation(paramsIdSchema), rejectFriendRequest);

export default router;
