import { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BadRequestException, InternalException } from '../../shared/response/exception.response';
import AppError from '../error-handler/app-error';
import { deleteFileHelper } from '../general/file.util';
import { fileTypes, resolveFileTypes, TFileType } from './mime-types';
import verifyFileSignatures from './verify-file-signatures';

// ==========================================
// 1. Shared File Filter
// ==========================================
const createFileFilter = (typeInput: TFileType | TFileType[]) => {
	return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
		const { allowedList, friendlyMsg } = resolveFileTypes(typeInput);

		if (!allowedList) {
			return cb(
				new InternalException(
					`Developer Error: Invalid file type category provided: ${typeInput}`,
					'Multer File Filter Setup',
				),
			);
		}

		const isAll = Array.isArray(typeInput) ? typeInput.includes('all') : typeInput === 'all';

		if (isAll || allowedList.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new BadRequestException(`Invalid file format! Allowed formats: ${friendlyMsg}`, 'User File Type Verification'));
		}
	};
};

// ==========================================
// 2. Shared Middleware Wrapper (Local & Cloud)
// ==========================================

type runMiddlewareProps = {
	multerInstance: RequestHandler;
	maxCount: number;
	expectedFieldName: string;
	type: TFileType;
	size: number;
	isLocal: boolean;
};
const runMiddleware = ({ multerInstance, maxCount, expectedFieldName, type, size, isLocal }: runMiddlewareProps) => {
	return (req: Request, res: Response, next: NextFunction) => {
		multerInstance(req, res, async (err: unknown) => {
			if (err) {
				if (err instanceof multer.MulterError) {
					let message = `File upload error: ${err.message}`;

					if (err.code === 'LIMIT_FILE_SIZE') {
						const sizeInMB = (size / (1024 * 1024)).toFixed(1).replace('.0', '');
						message = `File size too large. Maximum allowed size is ${sizeInMB}MB.`;
						return next(new BadRequestException(message, 'multer_limit_file_size'));
					}

					if (err.code === 'LIMIT_UNEXPECTED_FILE') {
						const receivedField = err.field;

						if (receivedField && receivedField !== expectedFieldName) {
							message = `Invalid field name '${receivedField}'. Please upload your file(s) using the field name '${expectedFieldName}'.`;
						}

						return next(new BadRequestException(message, 'multer_limit_file_count'));
					}

					if (err.code === 'LIMIT_FILE_COUNT') {
						message =
							maxCount === 1
								? `Only 1 file is allowed to be uploaded under the field '${expectedFieldName}'.`
								: `Too many files uploaded. Maximum limit allowed is ${maxCount} files for field '${expectedFieldName}'.`;
					}

					return next(new BadRequestException(message, `multer_${err.code}`));
				}

				return next(err);
			}

			// 🔒 Deep MIME Type Signature Verification Layer
			const uploadedFiles = req.file ? [req.file] : req.files || [];

			const uploadedFilesArray = Array.isArray(uploadedFiles) ? uploadedFiles : Object.values(uploadedFiles).flat();

			try {
				// Resolve the mixed allowed list dynamically
				const { allowedList } = resolveFileTypes(type);

				// Validate buffer or file path signatures
				await verifyFileSignatures(uploadedFilesArray, allowedList || [], type);

				next();
			} catch (sigError) {
				// Cleanup on local disk if verification fails
				if (isLocal && uploadedFilesArray.length > 0) {
					const allPathsToPurge = uploadedFilesArray.map((f) => f.path).filter(Boolean);
					await deleteFileHelper(allPathsToPurge, true);
				}

				if ((sigError as AppError).isOperational) {
					return next(sigError);
				}

				return next(
					new InternalException(
						'Internal server error during file security verification.' + (sigError as Error).message || '',
						'file_signature_error',
						500,
						sigError,
					),
				);
			}
		});
	};
};

// ==========================================
// 3. Local Storage Configuration Helper
// ==========================================
const createLocalStorage = (dir: string) => {
	const basePathname = `uploads/${dir}/`;

	return multer.diskStorage({
		destination: async (req, _file, cb) => {
			let userBasePath = basePathname;
			if (req?.user?._id) userBasePath += `${req.user._id}/`;
			const fullPathname = path.resolve(process.cwd(), 'src', userBasePath);
			try {
				await fs.mkdir(fullPathname, { recursive: true });
				cb(null, fullPathname);
			} catch (err) {
				cb(
					new InternalException(
						'Server failed to allocate upload space. ' + (err as Error).message || '',
						'Multer Storage Destination',
						500,
						err,
					),
					'',
				);
			}
		},
		filename: (req, file: Express.Multer.File & { filePath?: string }, cb) => {
			const fileExt = path.extname(file.originalname);
			const uniqueFilename = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
			let userBasePath = basePathname;
			if (req?.user?._id) userBasePath += `${req.user._id}/`;
			file.filePath = `${userBasePath}${uniqueFilename}`;
			cb(null, uniqueFilename);
		},
	});
};

// ==========================================
// 4. Main Factory Function
// ==========================================
export type TUploadFactory = {
	storageType?: 'local' | 'cloud';
	dir?: string | undefined;
	type?: TFileType | undefined;
	size?: number | undefined;
};
export const uploadFactory = ({
	storageType = 'cloud', // 'local' or 'cloud'
	dir = 'general', // Only used for 'local'
	type = fileTypes.images,
	size = 2 * 1024 * 1024,
}: TUploadFactory) => {
	const isLocal: boolean = storageType === 'local';

	// Select storage strategy based on parameter
	const storage = isLocal ? createLocalStorage(dir) : multer.memoryStorage();
	const fileFilter = createFileFilter(type);

	return {
		single: (fieldname: string) => {
			const upload = multer({ storage, fileFilter, limits: { fileSize: size } });
			return runMiddleware({
				multerInstance: upload.single(fieldname),
				maxCount: 1,
				expectedFieldName: fieldname,
				type,
				size,
				isLocal,
			});
		},
		array: (fieldname: string, maxCount: number) => {
			const upload = multer({ storage, fileFilter, limits: { fileSize: size, files: maxCount } });
			return runMiddleware({
				multerInstance: upload.array(fieldname, maxCount),
				maxCount,
				expectedFieldName: fieldname,
				type,
				size,
				isLocal,
			});
		},
	};
};

// Aliases for clean imports and backward compatibility
export const uploadLocal = ({ dir, type, size }: { dir?: string; type?: TFileType; size?: number } = {}) =>
	uploadFactory({ storageType: 'local', dir, type, size });

export const uploadCloud = (type?: TFileType, size?: number) => uploadFactory({ storageType: 'cloud', type, size });
