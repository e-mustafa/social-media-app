import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { ENVprovidersAuth } from '../../../../config/env.config';
import { InternalException } from '../../../response/exception.response';

export async function verifyOAuth2Google(idToken: string): Promise<TokenPayload | undefined> {
	if (!idToken) {
		throw new InternalException('ID token is required', 'verifyOAuth2Google');
	}
	const client = new OAuth2Client();

	const ticket = await client.verifyIdToken({
		idToken,
		audience: ENVprovidersAuth.google.clientId, // Specify the WEB_CLIENT_ID of the app that accesses the backend
		// Or, if multiple clients access the backend:
		//[WEB_CLIENT_ID_1, WEB_CLIENT_ID_2, WEB_CLIENT_ID_3]
	});
	const payload = ticket.getPayload();
	// This ID is unique to each Google Account, making it suitable for use as a primary key
	// during account lookup. Email is not a good choice because it can be changed by the user.
	// const userid = payload['sub'];
	// If the request specified a Google Workspace domain:
	// const domain = payload['hd'];

	return payload;
}
