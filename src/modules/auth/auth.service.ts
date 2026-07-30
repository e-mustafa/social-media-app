import { ConflictException } from '../../utils/error-handler/app-error';
import User, { UserHDocument } from '../user/user.model';
import { IRegisterDTO } from './auth.validation';

class AuthServices {
	constructor() {}

	async register({ firstName, lastName, username, email, password, confirmPassword }: IRegisterDTO): Promise<boolean> {
		const existEmail = await User.findOne({ email }).select('email');
      if (existEmail) throw new ConflictException('This email is already registered', 'Email-exists_register');
      

      const user: UserHDocument = await User.create({
			firstName,
			lastName,
			username,
			email,
			password,
		});
		return true;
	}
}

export default new AuthServices();
