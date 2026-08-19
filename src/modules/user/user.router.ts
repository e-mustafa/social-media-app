import { Router } from 'express';
import { appConfig } from '../../config/app.config';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import { fileTypes } from '../../utils/upload-files/mime-types';
import { uploadCloud } from '../../utils/upload-files/multer';
import * as controller from './user.controller';
import {
	getUsersSchema,
	paramsIdSchema,
	updateProfileSchema,
	uploadAvatarSchema,
	uploadCoverSchema,
} from './user.validation';

const router = Router();

export const routes = {
	base: '/users',

	getMyProfile: '/profile',
	updateMyProfile: '/profile',
	// deleteMyProfile: '/profile',

	uploadAvatar: '/profile/avatar',
	deleteAvatar: '/profile/avatar',

	uploadCover: '/profile/cover',
	deleteCover: '/profile/cover',

	getUser: '/:userId',
	getUsers: '/',
};

// apply auth middleware for all routes in this router
router.use(auth());

// Profile -------------------------------------------------
router.get(routes.getMyProfile, controller.getMyProfile);
router.patch(routes.updateMyProfile, validation(updateProfileSchema), controller.updateProfile);

// upload/change avatar
router.patch(routes.uploadAvatar, uploadCloud().single('avatar'), validation(uploadAvatarSchema), controller.uploadUserPic);
// upload/change cover
router.patch(
	routes.uploadCover,
	uploadCloud(fileTypes.images, appConfig.user.cover.maxSize).single('cover'),
	validation(uploadCoverSchema),
	controller.uploadUserPic,
);

// delete avatar
router.delete(routes.uploadAvatar, controller.deleteUserPic('avatar'));
// delete cover
router.delete(routes.deleteCover, controller.deleteUserPic('cover'));

// Get user -------------------------------------------------
router.get(routes.getUser, validation(paramsIdSchema), controller.getUser);
router.get(routes.getUsers, validation(getUsersSchema), controller.getUsers);

// TODO add search and get users route /> by admin
export default router;
