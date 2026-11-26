import express from 'express';
import { bootstrap } from './bootstrap.js';

const app = express();

// Register middlewares and routes.
bootstrap(app);

export default app;

//! 👈🏻👈🏻👈🏻👈🏻 <-- postman collection
// https://documenter.getpostman.com/view/49016393/2sBY4Tpxq3

//! 👈🏻👈🏻👈🏻👈🏻 <-- Github link
// https://github.com/e-mustafa/social-media-app

// npm run dev2
