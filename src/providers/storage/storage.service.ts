import { appConfig } from '../../config/app.config';
import { StorageDiskEnum, StorageProviderEnum } from '../../shared/enums/files.enum';
import { CloudinaryResourceType, IStorageDriver, TAttachment, TDeleteAttachment, TUploadFileOptions } from '../../shared/types/file.type';
import { cloudinaryService } from './cloudinary.service';
import { s3Service } from './s3.service';

/**
 * Main Storage Gateway using Strategy Pattern.
 * Automatically switches between S3 and Cloudinary based on appConfig.
 */
export class StorageService implements IStorageDriver {
	private driver: IStorageDriver;

	constructor() {
		// Dynamic Strategy Selection via Configuration
		const provider: StorageProviderEnum = appConfig.uploadStorage.provider; // e.g., 'awsS3' | 'cloudinary'

		if (provider === StorageProviderEnum.AWS_S3) {
			this.driver = s3Service;
		} else {
			this.driver = cloudinaryService;
		}
	}

	/**
	 * Upload a single file using configured active provider
	 */
	async uploadFile(options: TUploadFileOptions): Promise<TAttachment> {
		return this.driver.uploadFile(options);
	}

	/**
	 * Upload multiple files concurrently using configured active provider
	 */
	async uploadMultipleFiles(
		files: Express.Multer.File[],
		folder?: string,
		storageDisk?: StorageDiskEnum,
	): Promise<TAttachment[]> {
		return this.driver.uploadMultipleFiles(files, folder, storageDisk);
	}

	/**
	 * Delete a single file using configured active provider
	 */
	async deleteFile(id: string, resourceType?: CloudinaryResourceType): Promise<void> {
		return this.driver.deleteFile(id, resourceType);
	}

	/**
	 * Delete multiple files using configured active provider
	 */
	async deleteFiles(files: TDeleteAttachment[]): Promise<void> {
		return this.driver.deleteFiles(files);
	}
}

// Single active instance exported to be used across the entire backend app
export default new StorageService();
