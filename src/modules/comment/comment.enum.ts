export const LikeTypesEnum = {
	LIKE: 'like',
	LOVE: 'love',
	HAHA: 'haha',
	WOW: 'wow',
	SAD: 'sad',
	ANGRY: 'angry',
} as const;

export type TLikeType = (typeof LikeTypesEnum)[keyof typeof LikeTypesEnum];
