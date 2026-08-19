import { model, Schema } from 'mongoose';
import { attachmentsSchemaDB } from '../post';
import { IComment } from './comment.types';

const commentSchema = new Schema<IComment>(
	{
		content: {
			type: String,
			required: [true, 'Content is required'],
			minLength: [3, 'Content must be at least 3 characters long'],
			maxLength: [1000, 'Content must be at most 1000 characters long'],
		},
		author: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Author is required'],
			index: true,
		},
		postId: {
			type: Schema.Types.ObjectId,
			ref: 'Post',
			required: [true, 'Post is required'],
			index: true,
		},
		parentId: {
			type: Schema.Types.ObjectId,
			ref: 'Comment',
			default: null, // Default to null for top-level post comments
			index: true,
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

		reactionsCount: {
			type: Number,
			default: 0,
			min: [0, 'Likes count cannot be negative'],
		},
		repliesCount: {
			type: Number,
			default: 0,
			min: [0, 'Replies count cannot be negative'],
		},
		// likes: [
		// 	{
		// 		user: { type: Schema.Types.ObjectId, ref: 'User' },
		// 		likeType: {
		// 			type: String,
		// 			enum: Object.values(LikeTypesEnum),
		// 			required: [true, 'Like type is required'],
		// 			default: LikeTypesEnum.LIKE,
		// 		},
		// 	},
		// ],

		// Automatically defaults to [] in Mongoose
		taggedUsers: {
			type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
			validate: {
				validator: (val: Schema.Types.ObjectId[]) => {
					return val.length <= 10;
				},
				message: 'Tagged users cannot exceed 10 users',
			},
		},
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

// Indexes ------------------------------------
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ postId: 1, createdAt: -1 });
// High-performance index for fetching both top-level comments (parentId: null) and replies (parentId: commentId)
commentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });

const Comment = model<IComment>('Comment', commentSchema);
export default Comment;
