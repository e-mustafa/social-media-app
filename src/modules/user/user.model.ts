import { HydratedDocument, model, Schema } from 'mongoose';
import { calcAge } from '../../utils/general/date';
import { GenderEnum, ProviderEnum, RoleEnum } from './user.enums';
import { IUser } from './user.types';

const userSchema = new Schema<IUser>(
	{
		firstName: {
			type: String,
			required: [true, 'FirstName required.'],
			minLength: [3, 'FirstName must be at least 3 characters'],
			maxLength: [30, 'FirstName must be at most 30 characters'],
			trim: true,
		},
		lastName: {
			type: String,
			required: [true, 'LastName required.'],
			minLength: [2, 'LastName must be at least 2 characters'],
			maxLength: [30, 'LastName must be at most 30 characters'],
			trim: true,
		},
		username: {
			type: String,
			required: [true, 'Username required.'],
			minLength: [6, 'Username must be at least 6 characters'],
			maxLength: [30, 'Username must be at most 30 characters'],
			unique: true,
			trim: true,
			lowercase: true,
		},
		email: {
			type: String,
			required: [true, 'Email required.'],
			unique: [true, 'Email must be unique, entered email already in use!'],
			maxLength: [50, 'FirstName must be at most 30 characters'],
			trim: true,
			match: [/^\w+([-.]?\w+)*@\w+([-.]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
		},
		password: {
			type: String,
			required: [
				function () {
					return this.provider === ProviderEnum.SYSTEM;
				},
				'Password required.',
			],
			minLength: [8, 'Password must be at least 8 characters'],
		},

		provider: {
			type: String,
			enum: Object.values(ProviderEnum),
			default: ProviderEnum.SYSTEM,
		},

		role: {
			type: Number,
			enum: Object.values(RoleEnum),
			default: RoleEnum.USER,
		},

		gender: {
			type: Number,
			enum: Object.values(GenderEnum),
			default: GenderEnum.MALE,
		},

		bio: String,
		avatar: {
			type: {
				id: String,
				url: String,
			},
			default: null,
			nullable: true,
		},

		covers: {
			type: [{ id: String, url: String }],
			_id: false,
			default: [],
		},

		birthDate: {
			type: Date,
			validate: {
				validator: function (value: Date) {
					return (calcAge(value) || 0) > 18;
				},
				message: 'Age must be at least 18 years old!',
			},
		},
		phone: String,

		verifiedAt: {
			type: Date,
		},

		loggedOutAllAt: Date,

		deactivatedAt: Date,
		deactivatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},

		deletedAt: {
			type: Date,
		},
	},
	{
		timestamps: true,
		validateBeforeSave: true,
		optimisticConcurrency: true,
		id: true,
		toObject: { virtuals: true },
		toJSON: {
			virtuals: true,
			transform(doc, ret) {
				delete ret.password;
				delete ret.deactivatedBy;
			},
		},
	},
);

const User = model<IUser>('User', userSchema);
export type UserHDocument = HydratedDocument<IUser>;
export default User;
