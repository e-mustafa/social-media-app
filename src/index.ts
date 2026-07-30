import express from 'express';
import { ENV } from './config/env.config';
import { bootstrap } from './bootstrap';

const app = express();

bootstrap(app);


export default app;
