import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import streamifier from 'streamifier';

import { ENVcloudinaryConfig } from '../../config/env.config';
import { InternalException } from '../../shared/response/exception.response';
import { Id, IFile } from '../../shared/types/validation.type';

// -----------------------------------------------------------------------------
// Cloudinary Configuration
// -----------------------------------------------------------------------------

cloudinary.config({
	cloud_name: ENVcloudinaryConfig.name,
	api_key: ENVcloudinaryConfig.apiKey,
	api_secret: ENVcloudinaryConfig.secret,
});

export default cloudinary;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CloudinaryResourceType = 'image' | 'video' | 'raw';

export interface UploadResult {
	/** Cloudinary public_id */
	id: string;

	/** Cloudinary secure URL */
	url: string;

	/** Cloudinary resource type */
	resourceType: CloudinaryResourceType;
}

export interface UploadOption extends UploadApiOptions {
	/** Prefix used to generate a unique public_id */
	prefix?: string;

	/** Explicit public_id used for overwrite scenarios such as avatar/cover */
	customPublicId?: string;

	// folder?: string;
}

/**
 * Upload a file buffer to Cloudinary using a stream.
 */
export const uploadToCloudinary = (file: IFile, options: UploadOption = {}): Promise<UploadResult> => {
	if (!file?.buffer || file.buffer.length === 0) {
		throw new InternalException('No valid file or file buffer provided', 'uploadToCloudinary');
	}

	return new Promise((resolve, reject) => {
		const { prefix, customPublicId, ...cloudinaryOptions } = options;

		const publicId = customPublicId || `${prefix || 'file'}_${Date.now()}_${Math.round(Math.random() * 1e5)}`;

		const uploadStream = cloudinary.uploader.upload_stream(
			{
				...cloudinaryOptions,

				// Controlled values should come after spread so callers
				// cannot accidentally override them.
				public_id: publicId,
				overwrite: true,
				invalidate: true,
				resource_type: cloudinaryOptions.resource_type || 'auto',
			},
			(error, result) => {
				if (error) {
					return reject(error);
				}

				if (!result) {
					return reject(new InternalException('Cloudinary returned an empty upload result', 'uploadToCloudinary'));
				}

				resolve({
					id: result.public_id,
					url: result.secure_url,
					resourceType: result.resource_type as CloudinaryResourceType,
				});
			},
		);

		streamifier.createReadStream(file.buffer).pipe(uploadStream);
	});
};

/**
 * Delete multiple Cloudinary resources.
 *
 * Resources are grouped by resource type because Cloudinary handles
 * image, video, and raw resources separately.
 */
export const deleteMultipleFromCloudinary = async (
	files: (Pick<UploadResult, 'id' | 'resourceType'> & { url?: string })[] | UploadResult[],
): Promise<void> => {
	if (!files.length) return;

	const groupedResources = files.reduce<Record<CloudinaryResourceType, string[]>>(
		(acc, file) => {
			acc[file.resourceType].push(file.id);
			return acc;
		},
		{
			image: [],
			video: [],
			raw: [],
		},
	);

	const deletePromises = (Object.entries(groupedResources) as [CloudinaryResourceType, string[]][])
		.filter(([, publicIds]) => publicIds.length > 0)
		.map(async ([resourceType, publicIds]) => {
			await cloudinary.api.delete_resources(publicIds, {
				resource_type: resourceType,
				type: 'upload',
			});
		});

	try {
		await Promise.all(deletePromises);
	} catch (error) {
		// Cleanup failure should not crash the main operation.
		// It should be monitored/logged for background cleanup.
		console.error('Failed to cleanup orphan files from Cloudinary:', error);
	}
};

/**
 * Upload multiple files concurrently.
 *
 * If one or more uploads fail, all successfully uploaded files
 * are deleted as a rollback operation.
 */
export const uploadMultipleToCloudinary = async (files: IFile[], options: UploadOption = {}): Promise<UploadResult[]> => {
	if (!files.length) return [];

	const results = await Promise.allSettled(files.map((file) => uploadToCloudinary(file, options)));

	const successfulUploads = results
		.filter((result): result is PromiseFulfilledResult<UploadResult> => result.status === 'fulfilled')
		.map((result) => result.value);

	const failedCount = results.filter((result) => result.status === 'rejected').length;

	if (failedCount > 0) {
		await deleteMultipleFromCloudinary(successfulUploads);

		throw new InternalException(
			`Failed to upload all attachments. ${failedCount} file(s) failed.`,
			'uploadMultipleToCloudinary',
		);
	}

	return successfulUploads;
};

/**
 * Upload user avatar or cover image.
 *
 * The same public_id is reused so the previous resource is overwritten.
 */
export const uploadUserProfileMedia = (
	file: IFile,
	userId: Id,
	fieldname: 'avatar' | 'cover',
	customPublicId?: string,
): Promise<UploadResult> => {
	const publicId = customPublicId || `${fieldname}_${userId}`;

	return uploadToCloudinary(file, {
		folder: `social_app/users/${userId}/profile`,
		customPublicId: publicId,
	});
};

/**
 * Upload multiple attachments for a post.
 */
export const uploadPostAttachments = (files: IFile[], userId: Id, postId: Id): Promise<UploadResult[]> => {
	return uploadMultipleToCloudinary(files, {
		folder: `social_app/users/${userId}/posts/${postId}`,
		prefix: 'attachment',
	});
};

/**
 * Upload multiple attachments for a comment.
 */
export const uploadCommentAttachments = (files: IFile[], userId: Id, postId: Id, commentId: Id): Promise<UploadResult[]> => {
	return uploadMultipleToCloudinary(files, {
		folder: `social_app/users/${userId}/posts/${postId}/comments/${commentId}`,
		prefix: 'attachment',
	});
};
