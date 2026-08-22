export const NotificationTypeEnum = {
	FRIEND_REQUEST: 'FRIEND_REQUEST',
	FRIEND_ACCEPTED: 'FRIEND_ACCEPTED',
	// FRIEND_REJECTED: 'FRIEND_REJECTED',

	POST_REACT: 'POST_REACT',
	POST_COMMENT: 'POST_COMMENT',
	POST_TAGGED: 'POST_TAGGED',
	
	COMMENT_REACT: 'COMMENT_REACT',
	COMMENT_REPLAY: 'COMMENT_REPLAY',
	COMMENT_TAGGED: 'COMMENT_TAGGED',

	// tagged in a post

} as const;

export type TNotificationType = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];
