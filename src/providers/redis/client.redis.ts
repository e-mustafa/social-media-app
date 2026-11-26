import chalk from 'chalk';
import { createClient } from 'redis';
import { ENV } from '../../config/env.config';

let redisConnectPromise: Promise<void> | null = null;
const isTlsUrl = ENV.db.redisUrl.startsWith('rediss://');

export const redisDB = createClient({
	url: ENV.db.redisUrl,
	socket: {
		connectTimeout: 10000,
		...(isTlsUrl ? { tls: true } : {}),
		reconnectStrategy: (retries: number) => {
			if (retries > 10) {
				return new Error('❌ Redis connection failed after maximum retries.');
			}
			return Math.min(retries * 200, 3000);
		},
	},
});

redisDB.on('error', (err: Error) => {
	console.log(chalk.red('❌ Redis Error:'), err.message);
});

redisDB.on('ready', () => {
	console.log(chalk.green('✔ Connected to Redis successfully 🏪'));
});

export async function connectRedis(): Promise<void> {
	if (!ENV.db.redisUrl) {
		console.error('❌ Redis Database connection error: No DB Link from env');
		return;
	}

	if (redisDB.isReady) {
		return;
	}

	if (!redisConnectPromise) {
		redisConnectPromise = redisDB
			.connect()
			.then(() => {
				console.log(chalk.green('✔ Redis connection initiated.'));
			})
			.catch((error: unknown) => {
				console.error(chalk.red('❌ Failed to connect to Redis:'), (error as Error).message);
			})
			.finally(() => {
				redisConnectPromise = null;
			});
	}

	await redisConnectPromise;
}
