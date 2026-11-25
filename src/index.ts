import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { bootstrap } from './bootstrap';

const app: Express = express();

// Cache the initialization promise so concurrent and warm invocations share one setup
let bootstrapPromise: Promise<void> | null = null;

const ensureBootstrapped = (): Promise<void> => {
	if (!bootstrapPromise) {
		bootstrapPromise = bootstrap(app);
	}
	return bootstrapPromise;
};

// Wait for bootstrap completion before executing routes or error handlers
app.use(async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
	try {
		await ensureBootstrapped();
		next();
	} catch (error: unknown) {
		next(error);
	}
});

export default app;

//! 👈🏻👈🏻👈🏻👈🏻 <-- postman collection
// https://documenter.getpostman.com/view/49016393/2sBY4Tpxq3

//! 👈🏻👈🏻👈🏻👈🏻 <-- Github link
// https://github.com/e-mustafa/social-media-app

// npm run dev2
