import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	PutObjectCommand,
	PutObjectCommandInput,
	S3Client,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { extname } from 'node:path';
import { appConfig } from '../../config/app.config';
import { ENV, ENV_AWS } from '../../config/env.config';
import { StorageDiskEnum } from '../../shared/enums/files.enum';
import { CloudinaryResourceType, IStorageDriver, TAttachment, TUploadFileOptions } from '../../shared/types/file.type';

export class S3Service implements IStorageDriver {
	private client: S3Client;
	private readonly bucket = ENV_AWS.bucket;
	private readonly region = ENV_AWS.region;

	constructor() {
		this.client = new S3Client({
			region: this.region,
			credentials: {
				accessKeyId: ENV_AWS.accessKeyId,
				secretAccessKey: ENV_AWS.secretAccessKey,
			},
		});
	}

	private getFileToResourceType(mimetype: string): CloudinaryResourceType {
		if (mimetype.startsWith('image/')) return 'image';
		if (mimetype.startsWith('video/')) return 'video';
		return 'raw';
	}

	private async cleanupLocalFile(filePath?: string): Promise<void> {
		if (!filePath) return;
		try {
			await unlink(filePath);
		} catch (unlinkError) {
			console.warn(`[S3Service] Temp file cleanup warning at ${filePath}:`, unlinkError);
		}
	}

	private generateS3Key(folder: string, file: Express.Multer.File, filename?: string, prefix?: string): string {
		const sanitizedAppName = ENV.appName.replaceAll(/ /g, '_');
		const generatedName =
			filename ||
			`${prefix || file.fieldname}_${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
		return `${sanitizedAppName}/${folder}/${generatedName}`;
	}

	async uploadFile(options: TUploadFileOptions): Promise<TAttachment> {
		console.log({ options });
		const {
			file,
			folder = 'general',
			prefix,
			filename,
			contentType,
			storageDisk = appConfig.uploadStorage.disk,
		} = options;

		const Key = this.generateS3Key(folder, file, filename, prefix);
		const resolvedContentType = contentType || file.mimetype || 'application/octet-stream';

		try {
			const commandInput: PutObjectCommandInput = {
				Bucket: this.bucket,
				Key,
				Body: storageDisk === StorageDiskEnum.MEMORY_STORAGE ? file.buffer : createReadStream(file.path),
				ContentType: resolvedContentType,
			};

			await this.client.send(new PutObjectCommand(commandInput));

			console.log({
				url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${Key}`,
				id: Key,
				resourceType: this.getFileToResourceType(resolvedContentType),
			});
			
			return {
				url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${Key}`,
				id: Key,
				resourceType: this.getFileToResourceType(resolvedContentType),
			};
		} catch (error) {
			console.error(`[S3Service Error] Failed to upload ${file.originalname}:`, error);
			throw error;
		} finally {
			if (storageDisk === StorageDiskEnum.DISK_STORAGE && file.path) {
				await this.cleanupLocalFile(file.path);
			}
		}
	}

	async deleteFile(key: string): Promise<void> {
		try {
			await this.client.send(
				new DeleteObjectCommand({
					Bucket: this.bucket,
					Key: key,
				}),
			);
		} catch (error) {
			console.error(`[S3Service Delete Error] Failed to delete object ${key}:`, error);
			throw error;
		}
	}

	async deleteFiles(files: TAttachment[]): Promise<void> {
		if (!files.length) return;
		try {
			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: this.bucket,
					Delete: {
						Objects: files.map((file) => ({ Key: file.id })),
					},
				}),
			);
		} catch (error) {
			console.error('[S3Service Delete Error] Failed to delete batch objects:', error);
			throw error;
		}
	}

	async uploadMultipleFiles(
		files: Express.Multer.File[],
		folder = 'general',
		storageDisk = appConfig.uploadStorage.disk,
	): Promise<TAttachment[]> {
		const uploadPromises = files.map((file) => this.uploadFile({ file, folder, storageDisk }));
		return await Promise.all(uploadPromises);
	}
}

export const s3Service = new S3Service();
