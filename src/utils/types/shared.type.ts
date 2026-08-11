import { Types } from 'mongoose';
import { ZodType } from 'zod';

// export type schemaKeys = keyof Request;
export type TSchemaKey = 'body' | 'query' | 'params' | 'cookies' | 'headers' | 'file' | 'files';

export type IFieldErrors = {
	[key in TSchemaKey]?: Record<string, string>;
};

export type TSchema = Partial<Record<TSchemaKey, ZodType>>;

export type ObjId = Types.ObjectId;
export type Id = Types.ObjectId | string;
