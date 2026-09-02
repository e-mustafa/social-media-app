import { Model, Schema, model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { IBlock } from './block.types';

const blockSchema = new Schema<IBlock>(
	{
		blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	},
	{ timestamps: true },
);

// use mongoose-lean-virtuals to get virtuals in lean queries
blockSchema.plugin(mongooseLeanVirtuals);

// Ensure a user cannot block the same user multiple times
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
// Index to quickly fetch all blocked IDs for feed filtering
blockSchema.index({ blocker: 1 });

export const Block: Model<IBlock> = model<IBlock>('Block', blockSchema);
