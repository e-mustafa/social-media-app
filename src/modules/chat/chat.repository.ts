import { BaseRepository } from '../../DB/base.repository';
import Chat from './chat.model';
import { IChat } from './chat.types';

export class ChatRepository extends BaseRepository<IChat> {
	constructor() {
		super(Chat);
	}
}

export default new ChatRepository();
