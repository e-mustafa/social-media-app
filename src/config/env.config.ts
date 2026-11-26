import { configDotenv } from 'dotenv';
import { StorageDiskEnum } from '../shared/enums/files.enum';

// Only load .env locally when environment variables are not already injected by the runtime
const hasInjectedEnv = Boolean(process.env.VERCEL || process.env.DATABASE_URL);

if (!hasInjectedEnv) {
	configDotenv();
}

const port = process.env.APP_PORT || '3500';
const resolveAppUrl = (): string => {
	if (process.env.APP_URL) {
		return process.env.APP_URL;
	}
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}
	return `http://localhost:${port}`;
};

const appUrl = resolveAppUrl();

export const ENV = {
	appName: process.env.APP_NAME || 'Social Media',
	port,
	environment: process.env.NODE_ENV || 'development',
	appUrl,
	apiBaseUrl: process.env.API_BASE_URL || '/api/v2',
	frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
	allowedOrigin: process.env.ALLOWED_ORIGIN || '',
	db: {
		dbUrl: process.env.DATABASE_URL || '',
		dbName: process.env.DATABASE_NAME || '',
		redisUrl: process.env.REDIS_URL || '',
	},
	security: {
		salt: process.env.SALT_ROUND,
		encKey: process.env.ENCRYPTION_KEY,
		iv: process.env.IV_LENGTH,
	},
	upload: {
		storageDisk: process.env.STORAGE_DISK || StorageDiskEnum.DISK_STORAGE,
	},
};

export const isDev = ENV.environment === 'development';

export const ENVjwtSignatureLevel = {
	user: {
		accessTokenSecret: process.env.ACCESS_TOKEN_USER_LEVEL || '',
		refreshTokenSecret: process.env.REFRESH_TOKEN_USER_LEVEL || '',
		accessTokenExpires: process.env.ACCESS_TOKEN_USER_EXPIRES_IN || '15m',
		refreshTokenExpires: process.env.REFRESH_TOKEN_USER_EXPIRES_IN || '7d',
	},
	admin: {
		accessTokenSecret: process.env.ACCESS_TOKEN_ADMIN_LEVEL || '',
		refreshTokenSecret: process.env.REFRESH_TOKEN_ADMIN_LEVEL || '',
		accessTokenExpires: process.env.ACCESS_TOKEN_ADMIN_EXPIRES_IN || '10m',
		refreshTokenExpires: process.env.REFRESH_TOKEN_ADMIN_EXPIRES_IN || '3d',
	},
};

export const ENVprovidersAuth = {
	google: {
		clientId: process.env.GOOGLE_CLIENT_ID || '',
		clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
		redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
	},
};

export const ENVemailConfig = {
	googleAppPassword: process.env.GOOGLE_APP_PASSWORD || '',
	googleEmail: process.env.GOOGLE_APP_EMAIL || '',
};

export const ENVcloudinaryConfig = {
	name: process.env.CLOUDINARY_NAME || '',
	apiKey: process.env.CLOUDINARY_API_KEY || '',
	secret: process.env.CLOUDINARY_API_SECRET || '',
};

export const ENVFirebaseAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_File || '';
export const ENVFirebaseAccountData = process.env.FIREBASE_SERVICE_ACCOUNT_DATA || '';

export const ENV_AWS = {
	region: process.env.AWS_REGION || '',
	bucket: process.env.AWS_BUCKET_NAME || '',
	accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
};
