import { CloudinaryResourceType, UploadResult } from '../../utils/upload-files/cloudinary';

export type IFile = Express.Multer.File;

export type TAttachment =
	| UploadResult
	| {
			id: string;
			url: string;
			resourceType: CloudinaryResourceType;
	  };
