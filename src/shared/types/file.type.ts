import { StorageDiskEnum } from '../enums/files.enum';

export type IFile = Express.Multer.File;

export type TAttachment = {
	id: string;
	url: string;
	resourceType: CloudinaryResourceType;
};

export type TDeleteAttachment = {
	id: string;
	url?: string;
	resourceType: CloudinaryResourceType;
};

export type CloudinaryResourceType = 'image' | 'video' | 'raw';

export interface TUploadFileOptions {
	file: Express.Multer.File;
	folder?: string;
	filename?: string;
	prefix?: string;
	contentType?: string;
	storageDisk?: StorageDiskEnum;
}

export interface IStorageDriver {
	uploadFile(options: TUploadFileOptions): Promise<TAttachment>;
	uploadMultipleFiles(files: Express.Multer.File[], folder?: string, storageDisk?: StorageDiskEnum): Promise<TAttachment[]>;
	deleteFile(id: string, resourceType?: CloudinaryResourceType): Promise<void>;
	deleteFiles(files: TDeleteAttachment[]): Promise<void>;
}
