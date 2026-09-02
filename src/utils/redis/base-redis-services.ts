import { ObjId } from '../../shared/types';
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
				value: expiresInSeconds,
			},
		});
	}

	public async get(key: TKey): Promise<TValue | null> {
		const data = await redisDB.get(this.getKey(key));

		if (!data) return null;

		if (this.isJson) {
			try {
				return JSON.parse(data) as TValue;
			} catch {
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

	// --- Redis Set Native Operations ---

	// Adds one or multiple members to a Redis Set and sets TTL
	public async sAdd(key: TKey, members: string | string[], expiresInSeconds: number = this.defaultTTL): Promise<number> {
		const redisKey = this.getKey(key);
		const itemsToAdd = Array.isArray(members) ? members : [members];

		if (itemsToAdd.length === 0) return 0;

		const addedCount = await redisDB.sAdd(redisKey, itemsToAdd);

		if (expiresInSeconds > 0) {
			await redisDB.expire(redisKey, expiresInSeconds);
		}

		return addedCount;
	}

	// Removes one or multiple members from a Redis Set
	public async sRem(key: TKey, members: string | string[]): Promise<number> {
		const redisKey = this.getKey(key);
		const itemsToRemove = Array.isArray(members) ? members : [members];

		if (itemsToRemove.length === 0) return 0;

		return await redisDB.sRem(redisKey, itemsToRemove);
	}

	// Returns total member count in a Redis Set
	public async sCard(key: TKey): Promise<number> {
		return await redisDB.sCard(this.getKey(key));
	}

	// Returns all members of a Redis Set
	public async sMembers(key: TKey): Promise<string[]> {
		return await redisDB.sMembers(this.getKey(key));
	}

	// Checks if a member exists in a Redis Set
	public async sIsMember(key: TKey, member: string): Promise<boolean> {
		const result = await redisDB.sIsMember(this.getKey(key), member);
		return result === 1 || result === true;
	}

	// --- Pattern Operations ---

	public async deletePattern(key: TKey): Promise<void> {
		const pattern = this.getKey(key);
		let batch: string[] = [];
		const BATCH_SIZE = 200;

		// Stream matching keys asynchronously using SCAN iterator
		for await (const result of redisDB.scanIterator({ MATCH: pattern, COUNT: BATCH_SIZE })) {
			const keyFound = Array.isArray(result) ? result[0] : result;
			if (keyFound) {
				batch.push(keyFound);
			}

			// Execute non-blocking batch unlink when threshold is reached
			if (batch.length >= BATCH_SIZE) {
				await redisDB.unlink(batch);
				batch = [];
			}
		}

		// Unlink any remaining keys in the last chunk
		if (batch.length > 0) {
			await redisDB.unlink(batch);
		}
	}

	public async getByPattern(key: TKey): Promise<TValue[]> {
		const pattern = this.getKey(key);
		const foundKeys: string[] = [];
		const BATCH_SIZE = 200;

		for await (const result of redisDB.scanIterator({ MATCH: pattern, COUNT: BATCH_SIZE })) {
			const keyFound = Array.isArray(result) ? result[0] : result;
			if (keyFound) {
				foundKeys.push(keyFound);
			}
		}

		if (foundKeys.length === 0) {
			return [];
		}

		const results: TValue[] = [];

		for (let i = 0; i < foundKeys.length; i += BATCH_SIZE) {
			const chunkKeys = foundKeys.slice(i, i + BATCH_SIZE);
			const rawValues = await redisDB.mGet(chunkKeys);

			for (const rawValue of rawValues) {
				if (!rawValue) continue;

				if (this.isJson) {
					try {
						const parsedValue = JSON.parse(rawValue) as TValue;
						results.push(parsedValue);
					} catch {
						continue;
					}
				} else {
					results.push(rawValue as unknown as TValue);
				}
			}
		}

		return results;
	}

	public async getByPatternWithKeys(key: TKey): Promise<Array<{ key: string; value: TValue }>> {
		const pattern = this.getKey(key);
		const foundKeys: string[] = [];
		const BATCH_SIZE = 200;

		for await (const result of redisDB.scanIterator({ MATCH: pattern, COUNT: BATCH_SIZE })) {
			if (Array.isArray(result)) {
				foundKeys.push(...result);
			} else if (result) {
				foundKeys.push(result);
			}
		}

		if (foundKeys.length === 0) {
			return [];
		}

		const results: Array<{ key: string; value: TValue }> = [];

		for (let i = 0; i < foundKeys.length; i += BATCH_SIZE) {
			const chunkKeys = foundKeys.slice(i, i + BATCH_SIZE);
			const rawValues = await redisDB.mGet(chunkKeys);

			chunkKeys.forEach((redisKey, index) => {
				const rawValue = rawValues[index];
				if (!rawValue) return;

				if (this.isJson) {
					try {
						const parsedValue = JSON.parse(rawValue) as TValue;
						results.push({ key: redisKey, value: parsedValue });
					} catch {
						// Skip corrupted JSON values gracefully
					}
				} else {
					results.push({ key: redisKey, value: rawValue as unknown as TValue });
				}
			});
		}

		return results;
	}
}
