export const FriendRequestStatusEnum = {
	PENDING: 'pending',
	// ACCEPTED: 'accepted',
	REJECTED: 'rejected',
} as const;

export type TFriendRequestStatus = (typeof FriendRequestStatusEnum)[keyof typeof FriendRequestStatusEnum];
