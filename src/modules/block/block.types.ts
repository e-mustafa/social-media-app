import { Document, HydratedDocument } from 'mongoose';
import { Id } from '../../shared/types';

export interface IBlock extends Document {
	blocker: Id;
	blocked: Id;
	createdAt: Date;
	updatedAt?: Date;
}

export type IBlockDocument = HydratedDocument<IBlock>;
