import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { ENVcloudinaryConfig } from '../../config/env.config';
import { InternalException } from '../response/exception.response';
import { Id } from '../types/shared.type';

cloudinary.config({
	cloud_name: ENVcloudinaryConfig.name,
	api_key: ENVcloudinaryConfig.apiKey,
	api_secret: ENVcloudinaryConfig.secret,
});

export default cloudinary;

export interface UploadResult {
	id: string;
	url: string;
	filetype: 'image' | 'video' | 'raw'; // Stores Cloudinary resource_type: 'image' | 'video' | 'raw'
	// format?: string; // Extension type e.g., 'png', 'mp4'
	// mimeType?: string; // Original client MIME type e.g., 'image/png'
}

// Clean and reusable Cloudinary buffer uploader helper
export const uploadToCloudinary = (
	file: Express.Multer.File,
	userId: Id,
	customPublicId?: string,
): Promise<UploadResult> => {
	if (!file || !file.buffer) {
		throw new InternalException('No valid file or file buffer provided', 'uploadToCloudinary');
	}
	return new Promise((resolve, reject) => {
		// Generate a truly unique ID for this cover to allow dynamic sorting/deleting
		const uniqueId = customPublicId || `cover_${Date.now()}_${Math.round(Math.random() * 1e5)}`;

		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: `users/${userId}`,
				public_id: uniqueId,
				overwrite: true,
				invalidate: true,
				resource_type: 'auto', // Auto-detect file type (image, video, raw)
			},
			(error, result) => {
				if (error) return reject(error);
				if (result) {
					result.resource_type;
					resolve({
						id: result?.public_id,
						url: result?.secure_url,
						filetype: result?.resource_type as UploadResult['filetype'],
					});
				}
			},
		);

		streamifier.createReadStream(file.buffer).pipe(uploadStream);
	});
};
