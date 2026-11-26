import express, { Express, Request, Response } from 'express';
import { bootstrap } from './bootstrap.js';

const app: Express = express();

// Initialize middlewares, routes, and database connections once per runtime instance
const appReady = bootstrap(app);

// Export handler that ensures async bootstrap completes before handling any serverless request
export default async function handler(req: Request, res: Response): Promise<void> {
	await appReady;
	app(req, res);
}

//! 👈🏻👈🏻👈🏻👈🏻 <-- postman collection
// https://documenter.getpostman.com/view/49016393/2sBY4Tpxq3

//! 👈🏻👈🏻👈🏻👈🏻 <-- Github link
// https://github.com/e-mustafa/social-media-app

// npm run dev2
