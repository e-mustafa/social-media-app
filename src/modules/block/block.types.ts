import { HydratedDocument } from 'mongoose';
import { Id } from '../../shared/types/validation.type';

export interface IBlock extends Document {
	blocker: Id;
	blocked: Id;
	createdAt: Date;
	updatedAt?: Date;
}

export type IBlockDocument = HydratedDocument<IBlock>;
