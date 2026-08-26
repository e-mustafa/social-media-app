import { NotificationTypeEnum } from '../../modules/notification/notification.enum';
import { TReactionType } from '../../modules/reaction/reaction.enum';
import { Id } from '../../shared/types';
import { sendNotification, sendNotificationToMany } from '../firebase/push.service';
import { TypedSafeEventEmitter } from './safe-event';

export interface IActor {
	_id: Id;
	firstName: string;
	lastName: string;
	name?: string;
}

// 1. Central Event Payloads Map (Strict Type Safety)
export interface INotifyEventsMap {
	'friend-request': { to: Id; sender: IActor; requestId: Id };
	'friend-accepted': { to: Id; sender: IActor; requestId: Id };
	'post-tagged': { toIds: Id[]; sender: IActor; postId: Id; content: string };
	'post-comment': { to: Id; sender: IActor; postId: Id; commentId: Id; content: string };
	'post-react': { to: Id; sender: IActor; postId: Id; reactionId: Id; reactionType: TReactionType };
	'comment-tagged': { toIds: Id[]; sender: IActor; postId: Id; commentId: Id; content: string };
	'comment-reply': { to: Id; sender: IActor; commentId: Id; replyId: Id; content: string };
	'comment-react': { to: Id; sender: IActor; commentId: Id; reactionId: Id };
}

// 2. Instantiate with Event Map
const notifyEvents = new TypedSafeEventEmitter<INotifyEventsMap>();

const fullName = (actor: IActor) => actor.name?.trim() || `${actor.firstName} ${actor.lastName}`;

// Friend request ----------------------------------------------
notifyEvents.onAsync('friend-request', async ({ to, sender, requestId }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: to,
		type: NotificationTypeEnum.FRIEND_REQUEST,
		title: 'New friend request',
		body: `${fullName(sender)} sent you a friend request`,
		requestId,
	});
});

notifyEvents.onAsync('friend-accepted', async ({ to, sender, requestId }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: to,
		type: NotificationTypeEnum.FRIEND_ACCEPTED,
		title: 'Friend request accepted',
		body: `${fullName(sender)} accepted your friend request`,
		requestId,
	});
});

// Post events ----------------------------------------------
notifyEvents.onAsync('post-tagged', async ({ toIds, sender, postId, content }) => {
	await sendNotificationToMany(toIds, {
		sendBy: sender._id,
		sendTo: toIds[0] || '',
		type: NotificationTypeEnum.POST_TAGGED,
		title: 'You were tagged',
		body: `${fullName(sender)} tagged you in a post: "${content?.slice(0, 100) || ''}"`,
		postId,
	});
});

notifyEvents.onAsync('post-comment', async ({ to, sender, postId, commentId, content }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: to,
		type: NotificationTypeEnum.POST_COMMENT,
		title: 'New comment',
		body: `${fullName(sender)} commented: "${content?.slice(0, 100) || ''}"`,
		postId,
		commentId,
	});
});

notifyEvents.onAsync('post-react', async ({ to, sender, postId, reactionId, reactionType }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: to,
		type: NotificationTypeEnum.POST_REACT,
		title: 'New reaction',
		body: `${fullName(sender)} reacted to your post with ${reactionType}`,
		postId,
		reactionId,
	});
});

// Comment events ----------------------------------------------
notifyEvents.onAsync('comment-tagged', async ({ toIds, sender, commentId, content }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: toIds[0] || '',
		type: NotificationTypeEnum.POST_TAGGED,
		title: 'You were tagged',
		body: `${fullName(sender)} tagged you in a comment: "${content?.slice(0, 100) || ''}"`,
		commentId,
	});
});

notifyEvents.onAsync('comment-reply', async ({ to, sender, commentId, replyId, content }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: to,
		type: NotificationTypeEnum.COMMENT_REPLAY,
		title: 'New reply',
		body: `${fullName(sender)} replied: "${content?.slice(0, 100) || ''}"`,
		commentId,
		replyId,
	});
});

notifyEvents.onAsync('comment-react', async ({ to, sender, commentId, reactionId }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: to,
		type: NotificationTypeEnum.COMMENT_REACT,
		title: 'New reaction',
		body: `${fullName(sender)} reacted to your comment`,
		commentId,
		reactionId,
	});
});

export default notifyEvents;
