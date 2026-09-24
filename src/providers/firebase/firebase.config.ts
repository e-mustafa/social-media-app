import { cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { ENVFirebaseAccountData } from '../../config/env.config';

let serviceAccount: ServiceAccount = {};

try {
	// const keyPath = resolve(ENVFirebaseAccountFile);
	// if (!existsSync(keyPath)) throw new Error('Firebase service account file not found');

	// serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;

	// use one line data in .env instead of file
	serviceAccount = JSON.parse(ENVFirebaseAccountData) as ServiceAccount;
} catch (error) {
	console.error('Error parsing Firebase service account file:', error);
}

const notificationApp = initializeApp({
	credential: cert(serviceAccount),
});

export default getMessaging(notificationApp);
