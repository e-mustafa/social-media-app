import chalk from 'chalk';
import mongoose from 'mongoose';
import { ENV } from './env.config';

export const connectDB = async () => {
	try {
		const cnn = await mongoose.connect(ENV.db.dbUrl, { serverSelectionTimeoutMS: 5000 });
		console.log(chalk.green(`✔ Database connected successfully on: ${cnn.connection.name}`));
	} catch (error) {
		console.error(chalk.red('❌ Database connection error:'), error);
		throw error;
		// process.exit(1);
	}
};
