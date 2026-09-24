export interface TStorageLocation {
	folder: string;
	filename?: string;
	prefix?: string;
}

export class StoragePathBuilder {
	/**
	 * User profile avatar location.
	 * Fixed filename allows deterministic overwrite on storage providers.
	 */
	static getUserPicLocation(userId: string, prefix: string = 'avatar'): TStorageLocation {
		return {
			folder: `users/${userId}/profile`,
			filename: `${prefix}_${userId}`, // Always results in public_id: users/123/profile/avatar
		};
	}

	/**
	 * Folder path for post attachments.
	 */
	static getPostAttachmentLocation(userId: string, postId: string, prefix: string = 'attachment'): TStorageLocation {
		return {
			folder: `users/${userId}/posts/${postId}`,
			prefix: 'attachment',
		};
	}

	/**
	 * Folder path for comment attachments.
	 */
	static getCommentAttachmentLocation(userId: string, postId: string, commentId: string): TStorageLocation {
		return {
			folder: `users/${userId}/posts/${postId}/comments/${commentId}`,
			prefix: 'attachment',
		};
	}
}
