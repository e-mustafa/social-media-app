import { Socket } from 'socket.io';
import { NotFoundException } from '../../shared/response/exception.response';
import { TAttachment } from '../../shared/types';
import { redisConnectedSocket } from '../../utils/redis/connected-socket-service.redis';
import { messageRepository } from '../message';
import { userRepository } from '../user';
import chatRepository from './chat.repository';


// export type ChatSocketEvent =
// 	| { type: 'message:send'; payload: ChatSendPayload }
// 	| { type: 'message:received'; payload: Message }
// 	| { type: 'message:read'; payload: ChatReadPayload }
// 	| { type: 'message:status_updated'; payload: MessageStatusPayload }
// 	| { type: 'typing:start'; payload: TypingPayload }
// 	| { type: 'typing:stop'; payload: TypingPayload }
// 	| { type: 'typing:user_status'; payload: TypingUserStatusPayload }
// 	| { type: 'recording:start'; payload: RecordingPayload }
// 	| { type: 'recording:stop'; payload: RecordingPayload }
// 	| { type: 'recording:user_status'; payload: RecordingUserStatusPayload }
// 	| { type: 'user:online_status'; payload: OnlineStatusPayload };


class ChatSocketService {
	async sendMessage({
		socket,
		data,
	}: {
		socket: Socket;
		data: { content: string; sendTo: string; attachments: TAttachment[] };
	}) {
		try {
			const sender = socket.user._id;
			const { content, sendTo, attachments } = data || {};

			const receiver = await userRepository.findById(sendTo).lean().exec();
			if (!receiver) {
				throw new NotFoundException('User not found', 'ChatSocketService.sendMessage');
			}

			const chat = await chatRepository
				.findOne({ group: { $exists: false }, participation: { $all: [sender, sendTo] } })
				.lean()
				.exec();

			if (!chat) {
				throw new NotFoundException('Chat not found', 'ChatSocketService.sendMessage');
			}

			const message = await messageRepository.create({
				sender,
				receiver: receiver._id,
				chat: chat._id,
				content,
				// attachments,
				// TODO: upload attachments
			});

			socket.emit('sent_Message', message);

			const receiverSockets = await redisConnectedSocket.get(receiver._id.toString());
			if (receiverSockets) {
				socket.to(receiverSockets).emit('receive_Message', { message, from: socket.user });
			}
		} catch (error) {
			socket.emit('custom_error', error);
		}
	}
}

export default new ChatSocketService();
