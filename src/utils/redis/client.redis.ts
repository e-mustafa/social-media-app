import chalk from 'chalk';
import { createClient } from 'redis';
import { ENV } from '../../config/env.config';

export const redisDB = createClient({
	url: ENV.db.redisUrl,
	socket: {
		// set connection timeout to 5 seconds to prevent infinite hanging in Serverless environment
		connectTimeout: 5000,
		reconnectStrategy: (retries: number) => {
			// if retries > 3, throw error and stop
			if (retries > 3) {
				return new Error('❌ Redis connection failed permanently. Skipping...');
			}
			// wait a short time between attempts
			return Math.min(retries * 100, 2000);
		},
	},
});

redisDB.on('error', (err) => console.log(chalk.red('❌ Redis Error:'), err.message));
redisDB.on('ready', () => console.log(chalk.green('✔ Connected to Redis successfully')));

export async function connectRedis() {
	// be sure that the client is not connected already to avoid errors in Serverless environment
	if (!redisDB.isOpen) {
		try {
			await redisDB.connect();
			console.log(chalk.green('✔ Redis connection initiated.'));
		} catch (error: unknown) {
			console.error(chalk.red('❌ Failed to connect to Redis:'), (error as Error).message);
			// Don't put process.exit(1) here so that the app doesn't stop completely if Redis is optional
		}
	}
}
