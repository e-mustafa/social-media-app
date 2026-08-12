import z from 'zod';
import { GenderEnum } from '../../modules/user/user.enums';

// Regex for strong password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Regex for Egyptian phone number: 01[0125][0-9]{8} -> 01012345678
const phoneRegex = /^01[0125][0-9]{8}$/;

const otpRegex = /^\d{6}$/;

const usernameRegex = /^[a-zA-Z0-9_]{6,30}$/;

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const emailRegex = /^\w+([-.]?\w+)*@\w+([-.]?\w+)*(\.\w{2,3})+$/;
// /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const uploadFileSchema = z.object({
	fieldname: z.string(),
	originalname: z.string(),
	encoding: z.string(),
	mimetype: z.string(),
	// Handles buffer validation cleanly for memoryStorage setups
	buffer: z
		.custom<Buffer>((val) => Buffer.isBuffer(val), {
			message: 'File buffer is required',
		})
		.optional(),
	destination: z.string().optional(),
	filename: z.string().optional(),
	size: z.number().positive('File cannot be empty'),
	path: z.string().optional(),
	filePath: z.string().optional(),
});

export const generalFields = {
	id: z.string('ID is required').trim().regex(objectIdRegex, 'ID is in-valid'),
	firstName: z
		.string({ error: 'First name is required' })
		.min(3, 'First name must be at least 3 characters long')
		.max(30, 'First name must be at most 30 characters long'),

	lastName: z
		.string({ error: 'Last name is required' })
		.min(2, 'Last name must be at least 2 characters long')
		.max(30, 'Last name must be at most 30 characters long'),

	username: z
		.string({ error: 'Username is required' })
		.min(6, 'Username must be at least 6 characters long')
		.max(30, 'Username must be at most 30 characters long')
		.regex(usernameRegex, 'Invalid username, Username must contain only letters, numbers, and underscores')
		.lowercase(),

	email: z.email({ error: 'Email is required' }).trim().lowercase(),

	password: z
		.string({ error: 'Password is required' })
		.regex(
			strongPasswordRegex,
			'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
		),

	confirmPassword: z.string({ error: 'Confirm password is required' }),

	bio: z.string().max(160, 'Bio must be at most 160 characters long'),
	gender: z.union([
		z.enum(GenderEnum),
		z.enum(Object.keys(GenderEnum)).transform((val) => GenderEnum[val as keyof typeof GenderEnum]),
	]),
	// birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
	birthdate: z.coerce.date(),
	phone: z.string({ error: 'Phone is required' }).regex(phoneRegex, 'Invalid phone number'),

	otp: z.string({ error: 'OTP is required' }).regex(otpRegex, 'OTP must be 6 digits'),
	token: z.string({ error: 'Token is required' }).min(6, 'Invalid token structure'),

	file: uploadFileSchema,

	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z
		.string()
		.trim()
		.max(100)
		.optional()
		.transform((val) => (val ? val : undefined)),
};

export const paramsIdSchema = {
	params: z.strictObject({
		id: generalFields.id,
	}),
};
export type IParamsIdDTO = z.infer<typeof paramsIdSchema.params>;

export const querySchema = {
	query: z.object({
		page: generalFields.page,
		limit: generalFields.limit,
		search: generalFields.search,
	}),
};
export type IQueryDTO = z.infer<typeof querySchema.query>;
