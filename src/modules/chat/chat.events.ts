import { Socket } from 'socket.io';
import chatSocketService from './chat.socket.service';

class ChatEvents {
	async sendMessage(socket: Socket) {
		socket.on('message:send', (data) => {
			return chatSocketService.sendMessage({ socket, data });
		});
	}
}


export default new ChatEvents();