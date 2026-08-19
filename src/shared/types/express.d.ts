import { IJwtPayload } from '../../utils/security/token/token.types';
import { IUserBody } from './database.type';

// Standard global Express augmentation for mixed/public routes
declare global {
	namespace Express {
		interface Request {
			user?: IUserBody;
			decoded?: IJwtPayload;
			body: Record<string, unknown>;
		}
	}
}
