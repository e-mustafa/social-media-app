import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

export const limiter: RateLimitRequestHandler = rateLimit({
	windowMs: 1000 * 60 * 15,
	limit: 100,
	message: {
		status: 429,
		message: 'Too many request, Please tray again later.',
	},
	standardHeaders: 'draft-8',
	legacyHeaders: false,

	// handler: (req, res) => {
	// 	res.status(429).json({ message: 'Too many request, Please tray again later.' });
	// },
});
