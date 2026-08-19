import { QueryFilter } from 'mongoose';
import { BaseRepository, IQueryOptions } from '../../DB/base.repository';
import { UserStatusEnum } from './user.enums';
import User from './user.model';
import { IUser } from './user.types';

export class UserRepository extends BaseRepository<IUser> {

	protected activeFilter: QueryFilter<IUser> = {
		status: UserStatusEnum.ACTIVE,
		$or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
	};

	constructor(private customFilter?: QueryFilter<IUser>) {
		super(User);
	}

	protected override getDefaultFilter() {
		if (!this.customFilter) return this.activeFilter;
		return { $and: [this.activeFilter, this.customFilter] };
	}

	findByEmail(email: string, options?: IQueryOptions): QueryFilter<IUser> {
		return this.findOne({ email }, options);
	}
}

export default new UserRepository();