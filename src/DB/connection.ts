import chalk from 'chalk';
import mongoose from 'mongoose';
import { ENV } from '../config/env.config';

// Cache active connection promise to avoid duplicate handshake attempts on concurrent requests
let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<void> => {
	if (!ENV.db.dbUrl) {
		console.error('❌ MongoDB Database connection error: No DB Link from env');
		return;
	}

	// Reuse existing open connection
	if (mongoose.connection.readyState === 1) {
		return;
	}

	if (!connectionPromise) {
		connectionPromise = mongoose
			.connect(ENV.db.dbUrl, {
				serverSelectionTimeoutMS: 15000,
				socketTimeoutMS: 30000,
				family: 4,
			})
			.then((conn) => {
				console.log(chalk.green('✔ Database connected successfully'));
				return conn;
			})
			.catch((error: unknown) => {
				connectionPromise = null;
				console.error(chalk.red('❌ Database connection error:'), error);
				throw error;
			});
	}

	await connectionPromise;
};
