import { NextFunction, Request, Response } from 'express';
import { AdminRoleEnum, RoleEnum, TRole } from '../modules/user/user.enums';
import { UserRepository } from '../modules/user/user.repository';
import { UnAuthorizedException } from '../utils/response/exception.response';
import { decodeToken } from '../utils/security/token/token';
import { IJwtPayload } from '../utils/security/token/token.types';

// Instantiate repository once outside request context
const UserRepo = new UserRepository();

export const auth = (isOptional = false) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		const authorization = req.headers.authorization;

		if (!authorization) {
			if (isOptional) return next();

			// BadRequestException('Authorization header is required', 'Auth-middleware-no-auth-header');
			throw new UnAuthorizedException('Authorization header is required', 'Auth-middleware-no-auth-header');
		}
		const decoded: IJwtPayload | null = decodeToken(authorization) || null;
		if (!decoded) {
			if (isOptional) return next();
			throw new UnAuthorizedException('Invalid or expired token payload', 'Auth-middleware-invalid-token');
		}
		req.decoded = decoded;

		const user = await UserRepo.findById(decoded.id).lean().select('-friends -blockedUsers -password').exec();
		if (!user) {
			if (isOptional) return next();
			throw new UnAuthorizedException('User account not found or inactive', 'Auth-middleware-user-not-found');
		}

		req.user = user;
		return next();
	};
};

export const authorization = (...allowedRoles: TRole[]) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		if (!allowedRoles.includes(req.user?.role || 0)) {
			throw new UnAuthorizedException('Unauthorized Access!!', 'Auth-middleware-unauthorized');
		}
		return next();
	};
};

// All users authentication
export const authOptional = () => {
	return auth(true);
};

// All admins authorization
export const requireAuthAdmins = () => {
	return authorization(...Object.values(AdminRoleEnum));
};

// User authorization
export const requireAuthUser = () => {
	return authorization(RoleEnum.USER);
};
