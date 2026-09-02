import { Server, Socket } from 'socket.io';
import chatEvents from './chat.socket.events';

class ChatGateway {
	/**
	 * Registers all chat-related socket events for socket connection
	 */
	register(io: Server, socket: Socket): void {
		chatEvents.registerPresenceEvents(io, socket);
		chatEvents.registerChatRoomEvents(socket);
		chatEvents.sendMessageEvents(io, socket);
		chatEvents.registerGroupEvents(io, socket);
		chatEvents.registerTypingEvents(socket);
		chatEvents.registerMessageStatusEvents(io, socket);
	}
}

export default new ChatGateway();
