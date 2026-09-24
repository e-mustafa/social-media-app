import { hash as argon2Hash, verify } from 'argon2';
import { compare, hash } from 'bcrypt';
import { ENV } from '../../config/env.config';

export const generateHash = async (
	text: string,
	salt: number = Number(ENV.security.salt),
	isHard: boolean = false,
): Promise<string> => {
	if (isHard) {
		return await argon2Hash(text);
	} else {
		return await hash(text, salt);
	}
};

export const verifyHash = async (text: string, hashedText: string, isHard: boolean = false) => {
	if (isHard) {
		return await verify(hashedText, text);
	} else {
		return await compare(text, hashedText);
	}
};
