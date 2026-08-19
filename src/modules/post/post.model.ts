import { model, Schema } from 'mongoose';
import { PostVisibilityEnum } from './post.enum';
import { IPost } from './post.types';

export const attachmentsSchemaDB = {
	type: [
		{
			id: { type: String, required: true },
			url: { type: String, required: true },
			resourceType: { type: String, required: true },
		},
	],
	_id: false,
};

const postSchema = new Schema<IPost>(
	{
		content: {
			type: String,
			required: [true, 'Content is required'],
			minLength: [3, 'Content must be at least 3 characters long'],
			maxLength: [50000, 'Content must be at most 50000 characters long'],
		},
		author: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Author is required'],
		},
		attachments: attachmentsSchemaDB,
		// {
		// 	type: [
		// 		{
		// 			id: { type: String, required: true },
		// 			url: { type: String, required: true },
		// 			resourceType: { type: String, required: true },
		// 		},
		// 	],
		// 	_id: false,
		// },
		isPublished: {
			type: Boolean,
			default: true,
			index: true,
		},
		visibility: {
			type: String,
			enum: Object.values(PostVisibilityEnum),
			default: PostVisibilityEnum.PUBLIC,
			index: true,
		},
		reactionsCount: {
			type: Number,
			default: 0,
			min: [0, 'Likes count cannot be negative'],
		},
		commentsCount: {
			type: Number,
			default: 0,
			min: [0, 'Comments count cannot be negative'],
		},
		taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	{
		timestamps: true,
		validateBeforeSave: true,
		optimisticConcurrency: true,
		id: true,
		toObject: { virtuals: true },
		toJSON: { virtuals: true },
	},
);

// Index for author's timeline/profile posts
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ visibility: 1, isPublished: 1, createdAt: -1 });

// virtuals ------------------------------------
// postSchema.virtual('comments', {
// 	localField: '_id',
// 	foreignField: 'postId',
// 	ref: 'Comment',
// 	count: true,
// });
// postSchema.virtual('commentsCount', {
// 	localField: '_id',
// 	foreignField: 'targetId',
// 	ref: 'Reaction',
// 	match: { reactionType: TargetTypeEnum.POST },
// 	count: true,
// });

// High-performance partial index for public feeds
// postSchema.index(
// 	{ visibility: 1, createdAt: -1 },
// 	{
// 		partialFilterExpression: {
// 			isPublished: true,
// 			deletedAt: null,
// 		},
// 		name: 'active_public_posts_idx',
// 	},
// );

const Post = model<IPost>('Post', postSchema);
export default Post;
