import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import streamifier from 'streamifier';
import { ENVcloudinaryConfig } from '../../config/env.config';
import { StorageDiskEnum } from '../../shared/enums/files.enum';
import { InternalException } from '../../shared/response/exception.response';
import { CloudinaryResourceType, IStorageDriver, TAttachment, TUploadFileOptions } from '../../shared/types';

export class CloudinaryService implements IStorageDriver {
	public cloudinary = cloudinary;

	constructor() {
		this.cloudinary.config({
			cloud_name: ENVcloudinaryConfig.name,
			api_key: ENVcloudinaryConfig.apiKey,
			api_secret: ENVcloudinaryConfig.secret,
		});
	}

	/**
	 * Maps standard MIME types to Cloudinary resource types
	 */
	private getMimetypeResourceType(mimetype: string): CloudinaryResourceType {
		if (mimetype.startsWith('image/')) return 'image';
		if (mimetype.startsWith('video/')) return 'video';
		return 'raw';
	}

	/**
	 * Uploads a single file buffer or stream to Cloudinary
	 */
	async uploadFile(options: TUploadFileOptions): Promise<TAttachment> {
		const { file, folder = 'general', prefix = 'file', filename } = options;

		if (!file?.buffer && !file?.path) {
			throw new InternalException('No valid file payload provided', 'uploadToCloudinary');
		}

		return new Promise((resolve, reject) => {
			const publicId = filename || `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e5)}`;
			const resourceType = this.getMimetypeResourceType(file.mimetype || '');

			const uploadOptions: UploadApiOptions = {
				folder,
				public_id: publicId,
				overwrite: true,
				invalidate: true,
				resource_type: resourceType,
			};

			const uploadStream = this.cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
				if (error) {
					return reject(error);
				}

				if (!result) {
					return reject(new InternalException('Cloudinary returned empty result', 'uploadToCloudinary'));
				}

				resolve({
					id: result.public_id,
					url: result.secure_url,
					resourceType: result.resource_type as CloudinaryResourceType,
				});
			});

			if (file.buffer) {
				const readStream = streamifier.createReadStream(file.buffer);
				readStream.on('error', (streamErr) => reject(streamErr));
				readStream.pipe(uploadStream);
			} else {
				reject(new InternalException('Memory buffer is required for Cloudinary stream upload', 'uploadToCloudinary'));
			}
		});
	}

	/**
	 * Deletes a single resource from Cloudinary
	 */
	async deleteFile(id: string, resourceType: CloudinaryResourceType = 'image'): Promise<void> {
		try {
			await this.cloudinary.uploader.destroy(id, {
				resource_type: resourceType,
				invalidate: true,
			});
		} catch (error) {
			console.error(`[CloudinaryService Delete Error] Failed to delete resource ${id}:`, error);
			throw error;
		}
	}

	/**
	 * Deletes multiple resources grouped by resource type
	 */
	async deleteFiles(files: TAttachment[]): Promise<void> {
		if (!files.length) return;

		const groupedResources = files.reduce<Record<CloudinaryResourceType, string[]>>(
			(acc, file) => {
				acc[file?.resourceType].push(file.id);
				return acc;
			},
			{ image: [], video: [], raw: [] },
		);

		const deletePromises = (Object.entries(groupedResources) as [CloudinaryResourceType, string[]][])
			.filter(([, publicIds]) => publicIds.length > 0)
			.map(async ([resourceType, publicIds]) => {
				await this.cloudinary.api.delete_resources(publicIds, {
					resource_type: resourceType,
					type: 'upload',
				});
			});

		try {
			await Promise.all(deletePromises);
		} catch (error) {
			console.error('[CloudinaryService Delete Error] Failed to cleanup files:', error);
		}
	}

	/**
	 * Uploads multiple files concurrently with rollback on error
	 */
	async uploadMultipleFiles(
		files: Express.Multer.File[],
		folder = 'general',
		storageDisk = StorageDiskEnum.MEMORY_STORAGE,
	): Promise<TAttachment[]> {
		if (!files.length) return [];

		const results = await Promise.allSettled(files.map((file) => this.uploadFile({ file, folder, storageDisk })));

		const successfulUploads = results
			.filter((res): res is PromiseFulfilledResult<TAttachment> => res.status === 'fulfilled')
			.map((res) => res.value);

		const failedCount = results.filter((res) => res.status === 'rejected').length;

		if (failedCount > 0) {
			await this.deleteFiles(successfulUploads);
			throw new InternalException(
				`Failed to upload all attachments. ${failedCount} file(s) failed.`,
				'uploadMultipleToCloudinary',
			);
		}

		return successfulUploads;
	}
}

export const cloudinaryService = new CloudinaryService();
