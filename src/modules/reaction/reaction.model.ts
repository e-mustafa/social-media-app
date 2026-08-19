import { Model, model, Schema } from 'mongoose';
import { ReactionTypeEnum, TargetTypeEnum } from './reaction.enum';
import { IReaction } from './reaction.types';

const reactionSchema = new Schema<IReaction>(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		targetId: { type: Schema.Types.ObjectId, required: true },
		targetType: {
			type: String,
			enum: Object.values(TargetTypeEnum),
			required: true,
		},
		reactionType: {
			type: String,
			enum: Object.values(ReactionTypeEnum),
			default: ReactionTypeEnum.LIKE,
			required: true,
		},
	},
	{ timestamps: true },
);

// Unique compound index preventing duplicate likes on comments
reactionSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
reactionSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });

const Reaction: Model<IReaction> = model<IReaction>('Reaction', reactionSchema);

export default Reaction;
