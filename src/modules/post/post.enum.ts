export const PostVisibilityEnum = {
	PUBLIC: 'public',
	PRIVATE: 'private',
	FRIENDS: 'friends',
} as const;

export type TPostVisibility = (typeof PostVisibilityEnum)[keyof typeof PostVisibilityEnum];