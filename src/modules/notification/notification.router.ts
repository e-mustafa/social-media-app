import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import {
	addDeviceToken,
	deleteAllNotifications,
	deleteNotification,
	listNotifications,
	markAllAsRead,
	markAsRead,
	removeDeviceToken,
	unreadCount,
} from './notification.controller';
import { addDeviceTokenSchema, getNotificationsSchema, paramsIdSchema } from './notification.validation';

const router = Router();

export const routes = {
	base: '/notifications',
	deviceToken: '/device-token',
	general: '/',
	unreadCount: '/unread-count',
	byId: '/:notificationId',
};

// apply auth middleware for all routes in this router
router.use(auth());

// deviceToken -------------------------------------------------
router
	.route(routes.deviceToken)
	.post(validation(addDeviceTokenSchema), addDeviceToken)
	.patch(validation(addDeviceTokenSchema), removeDeviceToken);

// notifications -------------------------------------------------
router.get(routes.unreadCount, unreadCount);

router
	.route(routes.general)
	.get(validation(getNotificationsSchema), listNotifications)
	.patch(markAllAsRead)
	.delete(deleteAllNotifications);

router
	.route(routes.byId)
	.patch(validation(paramsIdSchema), markAsRead)
	.delete(validation(paramsIdSchema), deleteNotification);

export default router;
