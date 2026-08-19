import { ObjId } from '../../shared/types/validation.type';
import { redisDB } from './client.redis';

export type TRedisKeyPart = string | number | ObjId;

export class BaseRedisCache<TKey = TRedisKeyPart, TValue = string | number | ObjId> {
	constructor(
		private keyPattern: (key: TKey) => string,
		private defaultTTL: number,
		private isJson: boolean = false,
	) {}

	private getKey(key: TKey): string {
		// Normalize string keys to lowercase and trim spaces to prevent case-mismatch issues in Redis
		const normalizedKey = typeof key === 'string' ? key.trim().toLowerCase() : key;
		return this.keyPattern(normalizedKey as TKey);
	}

	public async set(key: TKey, value: TValue, expiresInSeconds: number = this.defaultTTL): Promise<void> {
		const payload = this.isJson ? JSON.stringify(value) : `${value}`;
		await redisDB.set(this.getKey(key), payload, {
			expiration: {
				type: 'EX',
				value: expiresInSeconds, // 5 minutes
			},
		});
	}

	public async get(key: TKey): Promise<TValue | null> {
		const data = await redisDB.get(this.getKey(key));

		if (!data) return null;

		if (this.isJson) {
			try {
				return JSON.parse(data) as TValue;
			} catch (error) {
				return null;
			}
		}

		return data as TValue;
	}

	public async ttl(key: TKey): Promise<number> {
		return await redisDB.ttl(this.getKey(key));
	}

	public async delete(key: TKey): Promise<void> {
		await redisDB.del(this.getKey(key));
	}

	public async exists(key: TKey): Promise<boolean> {
		const result = await redisDB.exists(this.getKey(key));
		return result === 1;
	}

	public async incr(key: TKey): Promise<number> {
		return await redisDB.incr(this.getKey(key));
	}

	public async expire(key: TKey, seconds: number): Promise<void> {
		await redisDB.expire(this.getKey(key), seconds);
	}

	public async deletePattern(key: TKey): Promise<void> {
		const pattern = this.getKey(key);
		for await (const result of redisDB.scanIterator({ MATCH: pattern, COUNT: 100 })) {
			const keysToDelete = Array.isArray(result) ? result : [result];
			if (keysToDelete.length > 0) {
				await redisDB.del(keysToDelete);
			}
		}
	}
}
