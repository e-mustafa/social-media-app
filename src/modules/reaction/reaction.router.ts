import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { validation } from '../../middlewares/validation.middleware';
import * as controllers from './reaction.controller';
import { TargetTypeEnum } from './reaction.enum';
import { addReactionSchema, getReactionsSchema } from './reaction.validation';

const router = Router();

export const routes = {
	base: '/',
	getPostReactions: '/posts/:targetId/reactions',
	addPostReaction: '/posts/:targetId/reactions',
	removePostReaction: '/posts/:targetId/reactions',

	getCommentReactions: '/comments/:targetId/reactions',
	addCommentReaction: '/comments/:targetId/reactions',
	removeCommentReaction: '/comments/:targetId/reactions',
};

// apply auth middleware for all routes in this router
router.use(auth());

// Post reaction endpoints
router.get(routes.getPostReactions, validation(getReactionsSchema), controllers.getReactions(TargetTypeEnum.POST));
router.post(routes.addPostReaction, validation(addReactionSchema), controllers.addReaction(TargetTypeEnum.POST));
router.delete(routes.removePostReaction, controllers.removeReaction(TargetTypeEnum.POST));

// Comment reaction endpoints
router.get(routes.getCommentReactions, validation(getReactionsSchema), controllers.getReactions(TargetTypeEnum.COMMENT));
router.post(routes.addCommentReaction, validation(addReactionSchema), controllers.addReaction(TargetTypeEnum.COMMENT));
router.delete(routes.removeCommentReaction, controllers.removeReaction(TargetTypeEnum.COMMENT));

export default router;
