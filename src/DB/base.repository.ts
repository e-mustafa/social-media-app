import {
	ClientSession,
	HydratedDocument,
	InsertManyOptions,
	LeanOptions,
	Model,
	MongooseUpdateQueryOptions,
	PopulateOptions,
	Query,
	QueryFilter,
	SaveOptions,
	Types,
	UpdateQuery,
} from 'mongoose';

type Id = Types.ObjectId | string;

// Helper type to resolve lean return type based on original query result R
type LeanResult<R, T> = R extends Array<unknown> ? T[] : R extends null ? T | null : T;

// Helper type to unroll redundant array nesting
type EnsureArrayData<R> = R extends Array<infer U> ? U[] : R[];

export interface IPaginationMetaData {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface IPaginatedResult<Data> {
	data: Data;
	metadata: IPaginationMetaData;
}

// Query Options Interface
export interface IQueryOptions {
	returnDocument?: 'after' | 'before';
	runValidators?: boolean;
	session?: ClientSession;
	ignoreDefaultFilters?: boolean;
}

// Flexible Update Options
export interface IUpdateOptions extends MongooseUpdateQueryOptions {
	session?: ClientSession;
	runValidators?: boolean;
	ignoreDefaultFilters?: boolean;
}

// Flexible Delete Options
export interface IDeleteOptions {
	session?: ClientSession;
	strict?: boolean | string;
	ignoreDefaultFilters?: boolean;
}

// Result Interfaces
export interface IUpdateResult {
	exist: boolean;
	success: boolean;
	modifiedCount: number;
}

export interface IDeleteResult {
	exist: boolean;
	success: boolean;
	deletedCount: number;
}

// Repository Query Builder with Chaining
export class RepositoryQueryBuilder<T, R = HydratedDocument<T>> {
	private isLean = false;

	constructor(
		private Model: Model<T>,
		private query: Query<unknown, T>,
		private filter: QueryFilter<T>,
		private isPagination: boolean = false,
		private pageNum: number = 1,
		private limitNum: number = 10,
	) {}

	select(fields: string | string[] | Record<string, 0 | 1> | Record<string, number | boolean | string | object>) {
		this.query.select(fields);
		return this;
	}

	populate(options: string | PopulateOptions | (string | PopulateOptions)[]) {
		this.query.populate(options as PopulateOptions);
		return this;
	}

	sort(fields: string | Record<string, 1 | -1>) {
		this.query.sort(fields);
		return this;
	}

	// Cast return type from HydratedDocument<T> to plain T when lean() is chained
	lean<LeanType = LeanResult<R, T>>(options: LeanOptions = {}): RepositoryQueryBuilder<T, LeanType> {
		this.isLean = true;
		this.query.lean({ virtuals: true, ...options });
		return this as unknown as RepositoryQueryBuilder<T, LeanType>;
	}

	session(session: ClientSession) {
		this.query.session(session);
		return this;
	}

	paginate(page: number = 1, limit: number = 10): RepositoryQueryBuilder<T, IPaginatedResult<EnsureArrayData<R>>> {
		this.isPagination = true;
		this.pageNum = Math.max(1, page);
		this.limitNum = Math.max(1, limit);
		return this as unknown as RepositoryQueryBuilder<T, IPaginatedResult<EnsureArrayData<R>>>;
	}

	async exec(): Promise<R> {
		if (this.isPagination) {
			const skip = (this.pageNum - 1) * this.limitNum;
			this.query.skip(skip).limit(this.limitNum);

			const session = this.query.getOptions()?.session as ClientSession | undefined;

			const [data, total] = await Promise.all([
				this.query.exec(),
				this.Model.countDocuments(this.filter, { ...(session ? { session } : undefined) }),
			]);

			const totalPages = Math.ceil(total / this.limitNum);

			return {
				data: data as unknown as R,
				metadata: {
					page: this.pageNum,
					limit: this.limitNum,
					total,
					totalPages,
					hasNext: this.pageNum < totalPages,
					hasPrev: this.pageNum > 1,
				},
			} as R;
		}

		const result = await this.query.exec();
		return result as unknown as R;
	}
}

// Base Repository Implementation
export abstract class BaseRepository<T> {
	constructor(protected readonly Model: Model<T>) {}

	protected getDefaultFilter(): QueryFilter<T> {
		return {} as QueryFilter<T>;
	}

	protected combineFilters(filter: QueryFilter<T>, ignoreDefaultFilters: boolean): QueryFilter<T> {
		if (ignoreDefaultFilters) return filter;

		const defaultFilter = this.getDefaultFilter();
		const hasDefault = defaultFilter && Object.keys(defaultFilter).length > 0;
		const hasUserFilter = filter && Object.keys(filter).length > 0;

		if (!hasDefault) return filter;
		if (!hasUserFilter) return defaultFilter;

		return { $and: [defaultFilter, filter] };
	}

	// 1. Read Operations
	find(filter: QueryFilter<T> = {}, options?: IQueryOptions): RepositoryQueryBuilder<T, HydratedDocument<T>[]> {
		const finalFilter = this.combineFilters(filter, !!options?.ignoreDefaultFilters);
		const query = this.Model.find(finalFilter);
		return new RepositoryQueryBuilder<T, HydratedDocument<T>[]>(this.Model, query, filter);
	}

	findOne(filter: QueryFilter<T>, options?: IQueryOptions): RepositoryQueryBuilder<T, HydratedDocument<T> | null> {
		const finalFilter = this.combineFilters(filter, !!options?.ignoreDefaultFilters);
		const query = this.Model.findOne(finalFilter);
		return new RepositoryQueryBuilder<T, HydratedDocument<T> | null>(this.Model, query, filter);
	}

	findById(id: Id, options?: IQueryOptions): RepositoryQueryBuilder<T, HydratedDocument<T> | null> {
		const filter = { _id: id } as QueryFilter<T>;
		const finalFilter = this.combineFilters(filter, !!options?.ignoreDefaultFilters);
		const query = this.Model.findOne(finalFilter);
		return new RepositoryQueryBuilder<T, HydratedDocument<T> | null>(this.Model, query, filter);
	}

	findOneAndUpdate(
		filter: QueryFilter<T>,
		update: UpdateQuery<T>,
		queryOptions?: IQueryOptions,
	): RepositoryQueryBuilder<T, HydratedDocument<T> | null> {
		const finalFilter = this.combineFilters(filter, !!queryOptions?.ignoreDefaultFilters);
		const query = this.Model.findOneAndUpdate(finalFilter, update, {
			returnDocument: 'after',
			runValidators: true,
			...queryOptions,
		});
		return new RepositoryQueryBuilder<T, HydratedDocument<T> | null>(this.Model, query, filter);
	}

	findOneAndDelete(
		filter: QueryFilter<T>,
		queryOptions?: IQueryOptions,
	): RepositoryQueryBuilder<T, HydratedDocument<T> | null> {
		const finalFilter = this.combineFilters(filter, !!queryOptions?.ignoreDefaultFilters);
		const query = this.Model.findOneAndDelete(finalFilter, queryOptions);
		return new RepositoryQueryBuilder<T, HydratedDocument<T> | null>(this.Model, query, filter);
	}

	findByIdAndUpdate(
		id: Id,
		update: UpdateQuery<T>,
		queryOptions?: IQueryOptions,
	): RepositoryQueryBuilder<T, HydratedDocument<T> | null> {
		const filter = { _id: id } as QueryFilter<T>;
		const finalFilter = this.combineFilters(filter, !!queryOptions?.ignoreDefaultFilters);
		const query = this.Model.findOneAndUpdate(finalFilter, update, {
			returnDocument: 'after',
			runValidators: true,
			...queryOptions,
		});
		return new RepositoryQueryBuilder<T, HydratedDocument<T> | null>(this.Model, query, filter);
	}

	findByIdAndDelete(id: Id, queryOptions?: IQueryOptions): RepositoryQueryBuilder<T, HydratedDocument<T> | null> {
		const filter = { _id: id } as QueryFilter<T>;
		const finalFilter = this.combineFilters(filter, !!queryOptions?.ignoreDefaultFilters);
		const query = this.Model.findOneAndDelete(finalFilter, queryOptions);
		return new RepositoryQueryBuilder<T, HydratedDocument<T> | null>(this.Model, query, filter);
	}

	// 2. Document Creation & Instantiation Methods
	build(data: Partial<T>): HydratedDocument<T> {
		return new this.Model(data);
	}

	async save(doc: HydratedDocument<T>, options?: SaveOptions): Promise<HydratedDocument<T>> {
		return (await doc.save(options)) as unknown as HydratedDocument<T>;
	}

	async create(data: Partial<T>, options?: SaveOptions): Promise<HydratedDocument<T>> {
		const doc = this.build(data);
		return await this.save(doc, options);
	}

	// Bulk document creation using insertMany for optimal performance and strict type safety
	async createMany(data: Partial<T>[], options: InsertManyOptions = {}): Promise<HydratedDocument<T>[]> {
		const docs = await this.Model.insertMany(data, options);
		return docs as unknown as HydratedDocument<T>[];
	}

	// 3. Update Operations
	async updateOne(filter: QueryFilter<T>, update: UpdateQuery<T>, options?: IUpdateOptions): Promise<IUpdateResult> {
		const finalFilter = this.combineFilters(filter, !!options?.ignoreDefaultFilters);
		const res = await this.Model.updateOne(finalFilter, update, {
			runValidators: true,
			...options,
		});

		return {
			exist: res.matchedCount > 0,
			success: Boolean(res.acknowledged) && res.matchedCount > 0,
			modifiedCount: res.modifiedCount,
		};
	}

	async updateMany(filter: QueryFilter<T>, update: UpdateQuery<T>, options?: IUpdateOptions): Promise<IUpdateResult> {
		const finalFilter = this.combineFilters(filter, !!options?.ignoreDefaultFilters);
		const res = await this.Model.updateMany(finalFilter, update, {
			runValidators: true,
			...options,
		});

		return {
			exist: res.matchedCount > 0,
			success: Boolean(res.acknowledged) && res.matchedCount > 0,
			modifiedCount: res.modifiedCount,
		};
	}

	// 4. Delete Operations
	async deleteOne(filter: QueryFilter<T>, options?: IDeleteOptions): Promise<IDeleteResult> {
		const finalFilter = this.combineFilters(filter, !!options?.ignoreDefaultFilters);
		const res = await this.Model.deleteOne(finalFilter, options);
		return {
			exist: res.deletedCount > 0,
			success: Boolean(res.acknowledged) && res.deletedCount > 0,
			deletedCount: res.deletedCount,
		};
	}

	async deleteMany(filter: QueryFilter<T>, options?: IDeleteOptions): Promise<IDeleteResult> {
		const finalFilter = this.combineFilters(filter, !!options?.ignoreDefaultFilters);
		const res = await this.Model.deleteMany(finalFilter, options);
		return {
			exist: res.deletedCount > 0,
			success: Boolean(res.acknowledged) && res.deletedCount > 0,
			deletedCount: res.deletedCount,
		};
	}

	/**
	 * Starts a native Mongoose ClientSession manually.
	 */
	async startSession(): Promise<ClientSession> {
		return await this.Model.db.startSession();
	}

	/**
	 * Executes a callback within an automatically managed ACID transaction.
	 * Handles start, commit, rollback on error, and final session closure.
	 */
	async withTransaction<R>(action: (session: ClientSession) => Promise<R>): Promise<R> {
		const session = await this.Model.db.startSession();
		session.startTransaction();

		try {
			const result = await action(session);
			await session.commitTransaction();
			return result;
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			await session.endSession();
		}
	}
}

export class GenericRepository<T> extends BaseRepository<T> {
	constructor(Model: Model<T>) {
		super(Model);
	}
}
