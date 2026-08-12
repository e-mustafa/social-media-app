import { Router } from 'express';
import { appConfig } from '../../config/app.config';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import { fileTypes } from '../../utils/upload-files/mime-types';
import { uploadCloud } from '../../utils/upload-files/multer';
import { querySchema } from '../../utils/validation/general-fields.validation';
import {
	blockUser,
	deleteUserImg,
	getBlockUsers,
	getMyFriends,
	getMyProfile,
	getUser,
	getUsers,
	removeFriend,
	unblockUser,
	updateProfile,
	uploadUserImg,
} from './user.controller';
import { paramsIdSchema, updateProfileSchema, uploadAvatarSchema, uploadCoverSchema } from './user.validation';

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

	getBlockUsers: '/block',
	blockUser: '/block/:userId',
	unblockUser: '/unblock/:userId',

	getMyFriends: '/friends',
	removeFriend: '/friends/:userId',

	getUser: '/:userId',
	getUsers: '/',
};

// apply auth middleware for all routes in this router
router.use(auth());

// Profile -------------------------------------------------
router.get(routes.getMyProfile, getMyProfile);
router.patch(routes.updateMyProfile, validation(updateProfileSchema), updateProfile);
// upload/change avatar
router.patch(routes.uploadAvatar, uploadCloud().single('avatar'), validation(uploadAvatarSchema), uploadUserImg);
// upload/change cover
router.patch(
	routes.uploadCover,
	uploadCloud(fileTypes.images, appConfig.user.cover.maxSize).single('cover'),
	validation(uploadCoverSchema),
	uploadUserImg,
);
// delete avatar
router.delete(routes.uploadAvatar, deleteUserImg('avatar'));
// delete cover
router.delete(routes.deleteCover, deleteUserImg('cover'));

// Block -------------------------------------------------
router.get(routes.getBlockUsers, validation(querySchema), getBlockUsers);
router.patch(routes.blockUser, validation(paramsIdSchema), blockUser);
router.patch(routes.unblockUser, validation(paramsIdSchema), unblockUser);

// Friends -------------------------------------------------
router.get(routes.getMyFriends, validation(querySchema), getMyFriends);
router.delete(routes.removeFriend, validation(paramsIdSchema), removeFriend);

// Get user -------------------------------------------------
router.get(routes.getUser, validation(paramsIdSchema), getUser);
router.get(routes.getUsers, validation(querySchema), getUsers);

// TODO add search and get users route /> by admin
export default router;
