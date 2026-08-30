import { BaseRepository } from '../../DB/base.repository';
import Message from './message.model';
import { IMessage } from './message.types';

export class MessageRepository extends BaseRepository<IMessage> {
	constructor() {
		super(Message);
	}
}

export default new MessageRepository();
