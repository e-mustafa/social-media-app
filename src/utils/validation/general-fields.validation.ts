import z from 'zod';

// Regex for strong password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Regex for Egyptian phone number: 01[0125][0-9]{8} -> 01012345678
const phoneRegex = /^01[0125][0-9]{8}$/;

const otpRegex = /^\d{6}$/;

export const generalFields = {
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
		.max(30, 'Username must be at most 30 characters long'),

	email: z.email({ error: 'Email is required' }).trim(),

	password: z
		.string({ error: 'Password is required' })
		.regex(
			strongPasswordRegex,
			'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
   ),
   
   confirmPassword: z.string({ error: 'Confirm password is required' }),
   
	otp: z.string({ error: 'OTP is required' }).regex(otpRegex, 'OTP must be 6 digits'),
	token: z.string({ error: 'Token is required' }),
};
