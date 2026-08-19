import { Router } from 'express';
import { appConfig } from '../../config/app.config';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import { fileTypes } from '../../utils/upload-files/mime-types';
import { uploadCloud } from '../../utils/upload-files/multer';
// import * as controller from './comment.controller';
import {
	createComment,
	createReply,
	deleteComment,
	getCommentReplies,
	getPostComments,
	updateComment,
} from './comment.controller';
import { createCommentSchema, createReplySchema, getCommentRepliesSchema, getPostCommentsSchema, updateCommentSchema } from './comment.validation';

const router = Router();

export const routes = {
	base: '/',

	createComment: '/posts/:postId/comments',
	getPostComments: '/posts/:postId/comments',

	// getComment: '/comments/:commentId',
	updateComment: '/comments/:commentId',
	deleteComment: '/comments/:commentId',

	getCommentReplies: '/comments/:commentId/replies',
	createReply: '/comments/:commentId/replies',
};

// apply auth middleware for all routes in this router
router.use(auth());

// get maxCount and maxSize from appConfig
const { maxCount, maxSize } = appConfig.comment.attachments;

router.post(
	routes.createComment,
	uploadCloud(fileTypes.all, maxSize).array('attachments', maxCount),
	validation(createCommentSchema),
	createComment,
);

router.get(routes.getPostComments, validation(getPostCommentsSchema), getPostComments);

// router.get(routes.getComment, getComment);
router.patch(routes.updateComment, validation(updateCommentSchema), updateComment);
router.delete(routes.deleteComment, deleteComment);

// replies
router.get(routes.getCommentReplies, validation(getCommentRepliesSchema), getCommentReplies);
// router.get(routes.getReplies, getReplies);
router.post(
	routes.createReply,
	uploadCloud(fileTypes.all, maxSize).array('attachments', maxCount),
	validation(createReplySchema),
	createReply,
);

export default router;
