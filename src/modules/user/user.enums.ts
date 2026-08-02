export const GenderEnum = {
	MALE: 0,
	FEMALE: 1,
} as const;

export type TGender = (typeof GenderEnum)[keyof typeof GenderEnum];

export const ProviderEnum = {
	SYSTEM: 'system',
	GOOGLE: 'google',
	FACEBOOK: 'facebook',
	TWITTER: 'twitter',
} as const;

export type TProvider = (typeof ProviderEnum)[keyof typeof ProviderEnum];

export const RoleEnum = {
	USER: 0,
	ADMIN: 1,
	SUPER_ADMIN: 2,
} as const;

export type TRole = (typeof RoleEnum)[keyof typeof RoleEnum];

export const AdminRoleEnum = {
	ADMIN: 1,
	SUPER_ADMIN: 2,
} as const;

export type TAdminRole = (typeof AdminRoleEnum)[keyof typeof AdminRoleEnum];
