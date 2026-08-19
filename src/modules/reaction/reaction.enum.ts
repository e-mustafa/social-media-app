export const TargetTypeEnum = {
	POST: 'Post',
	COMMENT: 'Comment',
} as const;

export type TTargetType = (typeof TargetTypeEnum)[keyof typeof TargetTypeEnum];

export const ReactionTypeEnum = {
	LIKE: 'like',
	LOVE: 'love',
	HAHA: 'haha',
	WOW: 'wow',
	SAD: 'sad',
	ANGRY: 'angry',
} as const;

export type TReactionType = (typeof ReactionTypeEnum)[keyof typeof ReactionTypeEnum];
