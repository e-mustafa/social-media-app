import chalk from 'chalk';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors.config';
import { ENV } from './config/env.config';
import { limiter } from './config/rate-limit.config';
import { connectDB } from './DB/connection';
import { globalErrorHandler } from './middlewares/error.middleware';
import {
	authRouter,
	authRoutes,
	blockRouter,
	blockRoutes,
	chatRouter,
	chatRoutes,
	commentRouter,
	commentRoutes,
	friendRouter,
	friendRoutes,
	notificationRouter,
	notificationRoutes,
	postRouter,
	postRoutes,
	userRouter,
	userRoutes,
} from './modules';
import { reactionRouter, reactionRoutes } from './modules/reaction';
import { connectRedis } from './providers/redis/client.redis';
import { initializeSocket } from './providers/socket/socket.init';
import { NotFoundException } from './shared/response/exception.response';

const rawApiBaseUrl = ENV.apiBaseUrl.trim();
const apiBaseUrl = rawApiBaseUrl ? `/${rawApiBaseUrl.replace(/^\/+|\/+$/g, '')}` : '';

export const bootstrap = (app: Express): Express => {
	app.set('trust proxy', 1);

	// Security and CORS middlewares
	app.use(helmet());
	app.use(cors(corsOptions));
	app.use(limiter);

	// Body and cookie parsers
	app.use(express.json());
	app.use(cookieParser());

	// Ensure Database and Redis connections once per cold start or when disconnected
	app.use(async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
		try {
			await Promise.all([connectDB(), connectRedis()]);
			next();
		} catch (error) {
			next(error);
		}
	});

	app.get('/', (_req: Request, res: Response): void => {
		res.status(200).json({ message: `Welcome TO ${ENV.appName} APP` });
	});

	app.get(`${apiBaseUrl}/health`, (_req: Request, res: Response): void => {
		res.status(200).json({ status: 'ok', apiBaseUrl });
	});

	// Feature routes
	app.use(`${apiBaseUrl}${authRoutes.base}`, authRouter);
	app.use(`${apiBaseUrl}${userRoutes.base}`, userRouter);
	app.use(`${apiBaseUrl}${friendRoutes.base}`, friendRouter);
	app.use(`${apiBaseUrl}${blockRoutes.base}`, blockRouter);
	app.use(`${apiBaseUrl}${postRoutes.base}`, postRouter);
	app.use(`${apiBaseUrl}${commentRoutes.base}`, commentRouter);
	app.use(`${apiBaseUrl}${reactionRoutes.base}`, reactionRouter);
	app.use(`${apiBaseUrl}${notificationRoutes.base}`, notificationRouter);
	app.use(`${apiBaseUrl}${chatRoutes.base}`, chatRouter);

	// Handle unmatched routes
	app.use((_req: Request, _res: Response, _next: NextFunction): void => {
		throw new NotFoundException('❌ This route does not exist!', 'route_not_exist');
	});

	// Centralized error handler
	app.use(globalErrorHandler);

	// Start persistent HTTP and Socket.io server only outside Vercel serverless
	if (process.env.VERCEL !== '1') {
		const httpServer = app.listen(ENV.port, (): void => {
			console.log(chalk.bgGreenBright.bold('✔✔ App is running on port: 🏃🏻‍♂️  ' + ENV.port));
		});
		initializeSocket(httpServer);
	}

	return app;
};

export default bootstrap;
