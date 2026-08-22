import { model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { calcAge } from '../../utils/general/date';
import { decrypt } from '../../utils/security/encryption.security';
import { generateHash } from '../../utils/security/hash.security';
import { GenderEnum, ProviderEnum, RoleEnum, StatusReasonEnum, UserStatusEnum } from './user.enums';
import { IUser, IUserImg } from './user.types';

export const userImgSchema = new Schema<IUserImg>(
	{
		id: { type: String, required: true, trim: true },
		url: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

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
			lowercase: true,
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
			enum: {
				values: Object.values(ProviderEnum),
				message: "'{VALUE}' is not a valid provider",
			},
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
			type: userImgSchema,
			default: null,
			nullable: true,
		},

		cover: {
			// type: [userImgSchema],
			type: userImgSchema,
			default: null,
			nullable: true,
		},

		birthdate: {
			type: Date,
			validate: {
				validator: function (value: Date) {
					return (calcAge(value) || 0) >= 18;
				},
				message: 'Age must be at least 18 years old!',
			},
		},
		phone: String,

		verifiedAt: {
			type: Date,
		},

		loggedOutAllAt: Date,

		// freezedAt: Date,
		// freezedBy: {
		// 	type: Schema.Types.ObjectId,
		// 	ref: 'User',
		// },
		
		deviceTokens: [String],
		notificationEnabled: {
			type: Boolean,
			default: true,
		},

		status: {
			type: String,
			enum: Object.values(UserStatusEnum),
			default: UserStatusEnum.ACTIVE,
		},
		statusReason: { type: String, enum: Object.values(StatusReasonEnum) },
		statusChangedAt: { type: Date },

		deletedAt: {
			type: Date,
		},

		// Block
		// blockedUsers: {
		// 	type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		// 	default: [],
		// },

		// Friends
		// friends: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
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
				ret.id = ret._id.toString();
				delete ret.password;
				// delete ret._id;
				// delete ret.__v;
				ret.phone = ret.phone ? decrypt(ret.phone) : ret.phone;
				return ret;
			},
		},
	},
);

// use mongoose-lean-virtuals to get virtuals in lean queries
userSchema.plugin(mongooseLeanVirtuals);

// indexing ------------------------------------
// Compound index for active and non-deleted user queries
userSchema.index({ deletedAt: 1, status: 1 });
userSchema.index({ friends: 1 });
userSchema.index({ blockedUsers: 1 });

// virtuals ------------------------------------
userSchema.virtual('name').get(function () {
	if (!this.firstName || !this.lastName) return '';
	return `${this.firstName} ${this.lastName || ''}`.trim();
});

// middlewares ------------------------------------
// Document Middleware: Hash password on document save()
userSchema.pre('save', async function () {
	if (this.password && this.isModified('password')) {
		this.password = await generateHash(this.password, undefined, true);
	}
});

const User = model<IUser>('User', userSchema);
export default User;
