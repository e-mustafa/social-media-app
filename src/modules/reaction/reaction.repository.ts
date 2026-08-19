import { GenericRepository } from '../../DB/base.repository';
import Reaction from './reaction.model';
import { IReaction } from './reaction.types';

const reactionRepository: GenericRepository<IReaction> = new GenericRepository(Reaction);

export default reactionRepository;
