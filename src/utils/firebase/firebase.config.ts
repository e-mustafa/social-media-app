import { cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENVFirebaseAccountFile } from '../../config/env.config';

let serviceAccount: ServiceAccount = {};

try {
	const keyPath = resolve(ENVFirebaseAccountFile);
	if (!existsSync(keyPath)) throw new Error('Firebase service account file not found');

	serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;
} catch (error) {
	console.error('Error parsing Firebase service account file:', error);
}

const notificationApp = initializeApp({
	credential: cert(serviceAccount),
});

export default getMessaging(notificationApp);
