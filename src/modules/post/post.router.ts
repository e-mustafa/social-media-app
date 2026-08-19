import { Router } from 'express';
import { appConfig } from '../../config/app.config';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import { fileTypes } from '../../utils/upload-files/mime-types';
import { uploadCloud } from '../../utils/upload-files/multer';
import { createPost, deletePost, getFeeds, getMyPosts, getPost, getSomeUserPosts, updatePost } from './post.controller';
import { createPostSchema, getPostsSchema, postIdParamsSchema, updatePostSchema } from './post.validation';

const router = Router();

export const routes = {
	base: '/posts',

	getFeeds: '/', // GET Feeds
	getMyPosts: '/mine', // GET My Posts
	getMyDrafts: '/drafts', // GET My Drafts

	getSomeUserPosts: '/user/:userId', // GET Some User Posts

	createPost: '/',
	getPost: '/:postId',
	updatePost: '/:postId',
	deletePost: '/:postId',
};

// apply auth middleware for all routes in this router
router.use(auth());

const attachmentsConfig = appConfig.post.attachments;

router.get(routes.getMyPosts, validation(getPostsSchema), getMyPosts(false));
router.get(routes.getMyDrafts, validation(getPostsSchema), getMyPosts(true));

router.get(routes.getFeeds, validation(getPostsSchema), getFeeds);
router.get(routes.getSomeUserPosts, validation(getPostsSchema), getSomeUserPosts);

// /:postId
router.get(routes.getPost, validation(postIdParamsSchema), getPost);
router.post(
	routes.createPost,
	uploadCloud(fileTypes.all, attachmentsConfig.maxSize).array('attachments', attachmentsConfig.maxCount),
	validation(createPostSchema),
	createPost,
);
router.patch(
	routes.updatePost,
	uploadCloud(fileTypes.all, attachmentsConfig.maxSize).array('attachments', attachmentsConfig.maxCount),
	validation(updatePostSchema),
	updatePost,
);
router.delete(routes.deletePost, validation(postIdParamsSchema), deletePost);

export default router;
