import { CorsOptions } from 'cors';
import { ENV } from './env.config';

export const whiteList = [ENV.frontendUrl, ...(ENV.allowedOrigin ? ENV.allowedOrigin.split(', ') : [])];

export const corsOptions: CorsOptions = {
	credentials: true,
	origin: whiteList,
};

// export const corsOptions2: CorsOptions = {
// 	origin(origin, callback) {
// 		if (!origin) {
// 			return callback(null, true);
// 		}

// 		if (whiteList.includes(origin)) {
// 			callback(null, true);
// 		}

// 		return new Error('Not Allowed Origin By CORS');
// 	},
// };
