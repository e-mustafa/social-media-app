import { Server, Socket } from 'socket.io';
import chatEvents from './chat.socket.events';

class ChatGateway {
	/**
	 * Registers all chat-related socket events for active connection
	 */
	register(io: Server, socket: Socket): void {
		chatEvents.registerAllEvents(io, socket);
	}
}

export default new ChatGateway();
