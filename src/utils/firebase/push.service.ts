import { Message } from 'firebase-admin/messaging';
import { blockRepository, userRepository } from '../../modules';
import { Notification } from '../../modules/notification/notification.model';
import { NotificationPayload } from '../../modules/notification/notification.types';
import { Id } from '../../shared/types';
import messaging from './firebase.config';

/**
 * Builds a clean FCM data payload by excluding notification header fields (title, body, sendTo)
 * and safely converting remaining attributes (including Mongoose ObjectIds) to plain string key-values.
 */
export const buildNotificationData = (payload: NotificationPayload): Record<string, string> => {
	// Destructure internal/notification fields to prevent payload duplication
	const { sendTo, title, body, ...dataPayload } = payload || {};

	const data: Record<string, string> = {};

	Object.entries(dataPayload).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			// Properly convert Mongoose ObjectIds or primitives to safe strings
			data[key] = typeof value === 'object' && typeof value.toString === 'function' ? value.toString() : String(value);
		}
	});

	return data;
};

export const sendNotification = async (payload: NotificationPayload): Promise<void> => {
	const { sendBy, sendTo, type, title, body, requestId, postId, commentId, replyId, reactionId } = payload || {};
	try {
		if (sendBy.toString() === sendTo.toString()) return;
		// check if user exists and active
		const recipient = await userRepository.findById(sendTo).lean().select('notificationEnabled deviceTokens').exec();
		if (!recipient) return;

		// check if user is blocked
		if (await blockRepository.isBlocked(sendBy, sendTo)) return;

		const data: NotificationPayload = { sendBy, sendTo, type, title, body };

		if (requestId) data.requestId = requestId;
		if (postId) data.postId = postId;
		if (commentId) data.commentId = commentId;
		if (replyId) data.replyId = replyId;
		if (reactionId) data.reactionId = reactionId;

		await Notification.create(data);

		// check if user has disabled notifications
		if (!recipient.notificationEnabled) {
			console.log('[Push] skipped - user has disabled notifications');
			return;
		}

		// check if user has device tokens (FCM tokens)
		const tokens = recipient.deviceTokens ?? [];
		console.log('recipient', recipient);

		if (tokens.length === 0) {
			console.log('[Push] skipped - user has no device tokens');
			return;
		}

		// const res = await messaging.sendEachForMulticast({
		// 	tokens,
		// 	notification: { title, body },
		// 	data: buildNotificationData(payload),
		// });

		const messages: Message[] = tokens?.map((token) => ({
			token,
			data: buildNotificationData(payload),
			notification: { title, body },
		}));

		const res = await messaging.sendEach(messages);

		if (res.failureCount > 0) {
			console.log('[Push] failed to send notification');

			const expiredTokens: string[] = [];

			res.responses.forEach((res, i) => {
				if (!res.success) {
					if (res.error) {
						if (
							res.error.code === 'messaging/registration-token-not-registered' ||
							res.error.code === 'messaging/invalid-registration-token'
						) {
							if (tokens[i]) expiredTokens.push(tokens[i] || '');
						}
					}
				}
			});

			if (expiredTokens.length > 0) {
				await userRepository.updateOne({ _id: sendTo }, { $pull: { deviceTokens: { $in: expiredTokens } } });
				console.log(`[Push] Successfully cleaned up ${expiredTokens.length} expired token(s) from database.`);
			}
		}
	} catch (error) {
		console.log('[Push] failed to send notification', error);
	}
};

export const sendNotificationToMany = async (userIds: Id[], payload: NotificationPayload): Promise<void> => {
	await Promise.all(userIds.map((userid) => sendNotification({ ...payload, sendTo: userid })));
};
