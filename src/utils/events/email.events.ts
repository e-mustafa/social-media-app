import { appConfig } from '../../config/app.config';
import { sendResetPasswordEmail } from '../emails/reset-password.email';
import { verifyAccountEmail } from '../emails/verify-account.email';
import SafeEventEmitter from './safe-event';

const emailEvents = new SafeEventEmitter();

emailEvents.onAsync('verify-account', async (email: string, name: string, otp: string | number) => {
	await verifyAccountEmail(email, name, otp);
});

emailEvents.onAsync(
	'reset-password',
	async (email: string, name: string, resetLink: string, expiresIn: number = appConfig.otp.resetPassword.expiresIn) => {
		await sendResetPasswordEmail(email, name, resetLink, expiresIn);
	},
);

export default emailEvents;
