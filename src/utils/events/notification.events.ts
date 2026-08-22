import { NotificationTypeEnum } from '../../modules/notification/notification.enum';
import { TReactionType } from '../../modules/reaction/reaction.enum';
import { Id, ObjId } from '../../shared/types';
import { sendNotification } from '../firebase/push.service';
import SafeEventEmitter from './safe-event';

interface IActor {
	_id: ObjId;
	firstName: string;
	lastName: string;
	name?: string;
}

const fullName = (actor: IActor) => actor.name?.trim() || `${actor.firstName} ${actor.lastName}`;

const notifyEvents = new SafeEventEmitter();

// Friend request ----------------------------------------------
notifyEvents.onAsync('friend-request', async ({ to, sender, requestId }: { to: Id; sender: IActor; requestId: Id }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: to,
		type: NotificationTypeEnum.FRIEND_REQUEST,
		title: 'New friend request',
		body: `${fullName(sender)} sent you a friend request`,
		requestId,
	});
});

notifyEvents.onAsync('friend-accepted', async ({ to, sender, requestId }: { to: Id; sender: IActor; requestId: Id }) => {
	await sendNotification({
		sendBy: sender._id,
		sendTo: to,
		type: NotificationTypeEnum.FRIEND_ACCEPTED,
		title: 'Friend request accepted',
		body: `${fullName(sender)} accepted your friend request`,
		requestId,
	});
});

// post ----------------------------------------------
notifyEvents.onAsync(
	'post-tagged',
	async ({ to, sender, postId, content }: { to: Id; sender: IActor; postId: Id; content: string }) => {
		await sendNotification({
			sendBy: sender._id,
			sendTo: to,
			type: NotificationTypeEnum.POST_TAGGED,
			title: 'You were tagged',
			body: `${fullName(sender)} tagged you in a post, "${content?.slice(0, 100) || ''}"`,
			postId,
		});
	},
);

notifyEvents.onAsync(
	'post-comment',
	async ({
		to,
		sender,
		postId,
		commentId,
		content,
	}: {
		to: Id;
		sender: IActor;
		postId: Id;
		commentId: Id;
		content: string;
	}) => {
		await sendNotification({
			sendBy: sender._id,
			sendTo: to,
			type: NotificationTypeEnum.POST_COMMENT,
			title: 'New comment',
			body: `${fullName(sender)} commented: "${content?.slice(0, 100) || ''}"`,
			postId,
			commentId,
		});
	},
);

notifyEvents.onAsync(
	'post-react',
	async ({
		to,
		sender,
		postId,
		reactionId,
		reactionType,
	}: {
		to: Id;
		sender: IActor;
		postId: Id;
		reactionId: Id;
		reactionType: TReactionType;
	}) => {
		await sendNotification({
			sendBy: sender._id,
			sendTo: to,
			type: NotificationTypeEnum.POST_REACT,
			title: 'New reaction',
			body: `${fullName(sender)} reacted to your post with ${reactionType}`,
			postId,
			reactionId,
		});
	},
);

// Comment ----------------------------------------------
notifyEvents.onAsync(
	'comment-tagged',
	async ({ to, sender, commentId, content }: { to: Id; sender: IActor; commentId: Id; content: string }) => {
		await sendNotification({
			sendBy: sender._id,
			sendTo: to,
			type: NotificationTypeEnum.POST_TAGGED,
			title: 'You were tagged',
			body: `${fullName(sender)} tagged you in a comment, "${content?.slice(0, 100) || ''}"`,
			commentId,
		});
	},
);
notifyEvents.onAsync(
	'comment-reply',
	async ({
		to,
		sender,
		commentId,
		replyId,
		content,
	}: {
		to: Id;
		sender: IActor;
		commentId: Id;
		replyId: Id;
		content: string;
	}) => {
		await sendNotification({
			sendBy: sender._id,
			sendTo: to,
			type: NotificationTypeEnum.COMMENT_REPLAY,
			title: 'New reply',
			body: `${fullName(sender)} replied: "${content?.slice(0, 100) || ''}"`,
			commentId,
			replyId,
		});
	},
);

notifyEvents.onAsync(
	'comment-react',
	async ({ to, sender, commentId, reactionId }: { to: Id; sender: IActor; commentId: Id; reactionId: Id }) => {
		await sendNotification({
			sendBy: sender._id,
			sendTo: to,
			type: NotificationTypeEnum.COMMENT_REACT,
			title: 'New reaction',
			body: `${fullName(sender)} reacted to your comment`,
			commentId,
			reactionId,
		});
	},
);

export default notifyEvents;
