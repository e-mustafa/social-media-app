import { appConfig } from '../../config/app.config';
import { sendResetPasswordEmail } from '../emails/reset-password.email';
import { verifyAccountEmail } from '../emails/verify-account.email';
import { TypedSafeEventEmitter } from './safe-event';

// 1. Central Event Payloads Map (Strict Type Safety)
export interface IEmailEventsMap {
	'verify-account': { email: string; name: string; otp: string | number };
	'reset-password': { email: string; name: string; resetLink: string; expiresIn?: number };
}

// 2. Instantiate with Event Map
const emailEvents = new TypedSafeEventEmitter<IEmailEventsMap>();

emailEvents.onAsync('verify-account', async ({ email, name, otp }) => {
	await verifyAccountEmail(email, name, otp);
});

emailEvents.onAsync(
	'reset-password',
	async ({ email, name, resetLink, expiresIn = appConfig.otp.resetPassword.expiresIn }) => {
		await sendResetPasswordEmail(email, name, resetLink, expiresIn);
	},
);

export default emailEvents;
