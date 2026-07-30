import { configDotenv } from 'dotenv';

configDotenv();

export const ENV = {
	appName: process.env.APP_NAME || 'Social Media',
	port: process.env.APP_PORT || '3500',
	environment: process.env.NODE_APP || 'development',
	appUrl: `${process.env.APP_URL}:${process.env.APP_PORT}`,
	apiBaseUrl: process.env.API_BASE_URL || '/api/v2',
	frontendUrl: process.env.FRONTEND_URL as string,
	allowedOrigin: process.env.ALLOWED_ORIGIN || '',
	db: {
		dbUrl: process.env.DATABASE_URL,
		dbName: process.env.DATABASE_Name,
		redisUrl: process.env.REDIS_URL,
	},
};

export const isDev = ENV.environment == 'development';
