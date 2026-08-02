import { waitUntil } from '@vercel/functions';
import chalk from 'chalk';
import nodemailer, { SendMailOptions } from 'nodemailer';
import { ENV, ENVemailConfig } from '../../config/env.config';

const transporter = nodemailer.createTransport({
	// host: emailConfig.smtp.host,
	// port: emailConfig.smtp.port,
	// secure: emailConfig.smtp.secure,
	service: 'gmail',
	auth: {
		user: ENVemailConfig.googleEmail,
		pass: ENVemailConfig.googleAppPassword,
	},
});

// export const sendEmail = asyncHandler(async ({ to, subject, html }) => {
// 	const info = await transporter.sendMail({
// 		from: `${configEnv.appName} <${emailConfig.googleEmail}>`,
// 		to,
// 		subject,
// 		html,
// 	});

// 	console.log(info);
// 	return info;
// });

export const sendEmail = async ({ to, subject, html }: SendMailOptions) => {
	// create promise for sending email
	const mailPromise = transporter
		.sendMail({
			from: `"${ENV.appName}" <${ENVemailConfig.googleEmail}>`,
			to,
			subject,
			html,
		})
		.then((info) => {
			console.log('✔ Email sent successfully:', info.messageId);
			return info;
		})
		.catch((err) => {
			console.error(chalk.yellow('❌ Email sending failed:', err.message));
		});

	// pass the promise to Vercel to prevent server freezing (using vercel function waitUntil)
	try {
		waitUntil(mailPromise);
	} catch (e) {
		// this part is for safety: if you are running the app locally (Local) without Vercel environment
		// the waitUntil function will not be available, so we will let the Event Loop handle the Promise naturally without blocking
		console.log(chalk.yellowBright('💡 Running outside Vercel. Email sent in local background.'), e);
	}

	// return immediate response to the Controller that the process has started in the background
	return { status: 'processing' };
};
