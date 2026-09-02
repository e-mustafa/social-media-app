import { appConfig } from '../../config/app.config';
import { Id } from '../../shared/types';
import { BaseRedisCache } from './base-redis-services';

// Base cache instance initialized for managing socket IDs per user via Redis Sets
const baseSocketCache = new BaseRedisCache<Id, string>(
	(userId) => `users:sockets:${userId}`,
	appConfig.socket.expiresIn,
	false,
);

export const redisConnectedSocket = {
	// Adds a new socket connection. Safely clears legacy String keys if encountered.
	async addSocket(userId: Id, socketId: string): Promise<boolean> {
		try {
			const countBefore = await baseSocketCache.sCard(userId);
			await baseSocketCache.sAdd(userId, socketId);
			return countBefore === 0;
		} catch (error: unknown) {
			// Auto-heal Redis data structure mismatch (WRONGTYPE) caused by migration from String to Set
			if (error instanceof Error && error.message.includes('WRONGTYPE')) {
				await baseSocketCache.delete(userId);
				await baseSocketCache.sAdd(userId, socketId);
				return true;
			}
			throw error;
		}
	},

	// Removes a disconnected socket from user's active set
	async removeSocket(userId: Id, socketId: string): Promise<boolean> {
		try {
			await baseSocketCache.sRem(userId, socketId);
			const remainingCount = await baseSocketCache.sCard(userId);

			if (remainingCount === 0) {
				await baseSocketCache.delete(userId);
				return true;
			}

			return false;
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('WRONGTYPE')) {
				await baseSocketCache.delete(userId);
				return true;
			}
			throw error;
		}
	},

	// Retrieves all active socket IDs for a user
	async getSockets(userId: Id): Promise<string[]> {
		try {
			return await baseSocketCache.sMembers(userId);
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('WRONGTYPE')) {
				await baseSocketCache.delete(userId);
				return [];
			}
			throw error;
		}
	},

	// Gets total count of connected devices for a user
	async getSocketCount(userId: Id): Promise<number> {
		try {
			return await baseSocketCache.sCard(userId);
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('WRONGTYPE')) {
				await baseSocketCache.delete(userId);
				return 0;
			}
			throw error;
		}
	},

	// Deletes socket key manually
	async deleteUserSockets(userId: Id): Promise<void> {
		await baseSocketCache.delete(userId);
	},
};
