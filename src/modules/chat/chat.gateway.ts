import { Socket } from 'socket.io';
import chatEvents from './chat.events';

class ChatGateway {
	register(socket: Socket) {
		socket.on('message:send', (data) => {
			console.log('message:send data', data);
			chatEvents.sendMessage(socket);
		});
	}
}

export default new ChatGateway();
