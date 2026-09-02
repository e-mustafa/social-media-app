import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import { querySchema } from '../../shared/validation/general-fields.validation';
import * as controller from './chat.controller';
import { chatIdParamsSchema, createGroupSchema, getChatMessagesSchema } from './chat.validation';

const router = Router();

export const routes = {
	base: '/chats',

	getChatList: '/',
	getChatMessageList: '/:chatId/messages',
	getUnreadCount: ':chatId/messages/unread-count',
	// getUserStatus: '/:userId/status', // online/lastSeenAt

	// createChat: '/create-chat',

	// group routes
	createGroup: '/create-group',

	// add participants
	// remove participants
	// add/update group name/Description
	// add/update group image
	// remove group image
	// delete group
	// leave group
	// join group
	// invite group
	// set admin
};

// apply auth middleware for all routes in this router
router.use(auth());

router.get(routes.getChatList, validation(querySchema), controller.getChatList);
router.get(routes.getChatMessageList, validation(getChatMessagesSchema), controller.getChatMessageList);
router.get(routes.getUnreadCount, validation(chatIdParamsSchema), controller.getUnreadCount);
// router.get(routes.getUserStatus, validation(chatIdParamsSchema), controller.getUserStatus);

// router.post(routes.createChat, validation(querySchema), controller.createChat);

// group routes
router.post(routes.createGroup, validation(createGroupSchema), controller.createGroup);

// router.get(routes.getSentRequests, validation(querySchema), getSentRequests);

// router.post(routes.sendRequest, validation(paramsIdSchema), sendFriendRequest);
// router.delete(routes.sendRequest, validation(paramsIdSchema), deleteFriendRequest);

// router.patch(routes.acceptRequest, validation(paramsIdSchema), acceptFriendRequest);
// router.patch(routes.rejectRequest, validation(paramsIdSchema), rejectFriendRequest);

export default router;
