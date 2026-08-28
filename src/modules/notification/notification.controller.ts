import { Request, Response } from 'express';
import { successResponse } from '../../shared/response/success.response';
import { Id } from '../../shared/types';
import services from './notification.service';
import { IAddDeviceTokenDTO, IGetNotificationsQueryDTO } from './notification.validation';

export async function addDeviceToken(req: Request, res: Response) {
	const { token }: IAddDeviceTokenDTO = req.body || {};
	await services.addDeviceToken(req.user?._id as Id, token);
	successResponse({ res, message: 'Device registered successfully' });
}

export async function removeDeviceToken(req: Request, res: Response) {
	const { token }: IAddDeviceTokenDTO = req.body || {};
	await services.removeDeviceToken(req.user?._id as Id, token);
	successResponse({ res, message: 'Device unregistered successfully' });
}

// Notifications -------------------------------------------
export async function listNotifications(req: Request, res: Response) {
	const result = await services.listNotifications(req.user?._id as Id, req.query as unknown as IGetNotificationsQueryDTO);
	successResponse({ res, ...result });
}

export async function unreadCount(req: Request, res: Response) {
	const unread = await services.unreadCount(req.user?._id as Id);
	successResponse({ res, data: unread });
}

export async function markAsRead(req: Request, res: Response) {
	const { notificationId } = req.params || {};
	const data = await services.markAsRead(req.user?._id as Id, notificationId as string);
	successResponse({ res, data });
}

export async function markAllAsRead(req: Request, res: Response) {
	await services.markAllAsRead(req.user?._id as Id);
	successResponse({ res, message: 'All notifications marked as read successfully' });
}

export async function deleteNotification(req: Request, res: Response) {
	const { notificationId } = req.params || {};
	await services.deleteNotification(req.user?._id as Id, notificationId as string);
	successResponse({ res, message: 'Notification deleted successfully' });
}

export async function deleteAllNotifications(req: Request, res: Response) {
	await services.deleteAllNotifications(req.user?._id as Id);
	successResponse({ res, message: 'All notifications deleted successfully' });
}
