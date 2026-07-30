import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors.config';
import { ENV } from './config/env.config';
import { limiter } from './config/rate-limit.config';
import { authRouter, authRoutes } from './modules';
import { NotFoundException } from './utils/error-handler/app-error';
import { globalErrorHandler } from './utils/error-handler/global-error-handler';

const apiBaseUrl = ENV.apiBaseUrl;

export const bootstrap = async (app: Express): Promise<void> => {
	app.use(helmet(), limiter, cors(corsOptions));
	app.use(express.json());

	app.get('/', (_req: Request, res: Response) => {
		res.status(200).json({ message: `Welcome TO ${ENV.appName} APP` });
	});

	// routes --------------------------------------------------------
	app.use(`${apiBaseUrl}${authRoutes.base}`, authRouter);
	// routes --------------------------------------------------------

	app.use((_req: Request, _res: Response, _next: NextFunction) => {
		throw new NotFoundException('❌ This route not exist!', 'route_not_exist');
	});

	app.use(globalErrorHandler);

	app.listen(ENV.port, () => console.log('✔ App is running on port: ' + ENV.port));
};
