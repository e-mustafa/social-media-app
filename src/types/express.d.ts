import { IUser } from '../../modules/user/user.types';
import { IJwtPayload } from '../security/token/token';

declare global {
	namespace Express {
		interface Request {
			user?: IUser;
			decoded?: IJwtPayload;

			// Allow dynamic indexed properties in req.body safely without resorting to any
			body: Record<string, unknown>;
		}
	}
}
