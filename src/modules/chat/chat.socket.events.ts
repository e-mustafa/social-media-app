import { Server, Socket } from 'socket.io';
import { userRepository } from '../user';
import chatSocketService from './chat.socket.service';
import {
	IChatRoomPayload,
	IGroupRoomPayload,
	IMarkAsSeenPayload,
	ISendGroupMessagePayload,
	ISendMessagePayload,
	IUserTypingPayload,
} from './chat.types';

// export type ChatSocketEvent =
// 	| { type: 'message:send'; payload: ChatSendPayload }
// 	| { type: 'message:received'; payload: Message }
// 	| { type: 'message:seen'; payload: ChatSeenPayload }
// 	| { type: 'message:status_updated'; payload: MessageStatusPayload }
// 	| { type: 'typing:start'; payload: TypingPayload }
// 	| { type: 'typing:stop'; payload: TypingPayload }
// 	| { type: 'typing:user_status'; payload: TypingUserStatusPayload }
// 	| { type: 'recording:start'; payload: RecordingPayload }
// 	| { type: 'recording:stop'; payload: RecordingPayload }
// 	| { type: 'recording:user_status'; payload: RecordingUserStatusPayload }
// 	| { type: 'user:online_status'; payload: OnlineStatusPayload };
// 	| { type: 'group:join_room'; payload: OnlineStatusPayload };
// 	| { type: 'chat:error'; payload: OnlineStatusPayload };

class ChatEvents {
	/**
	 * Registers user presence events (online/offline status)
	 */
	async registerPresenceEvents(io: Server, socket: Socket): Promise<void> {
		try {
			const user = socket.user;
			const userId = user._id.toString();

			console.log(`[Socket] connected: ${user.firstName} - ${socket.id}`);

			const isFirstDevice = await chatSocketService.registerUser(socket);
			if (isFirstDevice) {
				const usersIds = await chatSocketService.getFriendsAndChatUsers(userId);
				chatSocketService.notifyFriends(io, usersIds, 'user:online', { userId, online: true });
			}

			socket.on('disconnect', async () => {
				try {
					console.log(`[Socket] disconnected: ${user.firstName} - ${socket.id}`);

					const isLastDevice = await chatSocketService.revokeUser(socket);
					if (!isLastDevice) return;

					const lastSeenAt = new Date();
					await userRepository.updateOne({ _id: userId }, { lastSeenAt });

					const usersIds = await chatSocketService.getFriendsAndChatUsers(userId);
					chatSocketService.notifyFriends(io, usersIds, 'user:offline', { userId, online: false, lastSeenAt });
				} catch (error) {
					socket.emit('chat:error', error);
				}
			});
		} catch (error) {
			socket.emit('chat:error', error);
		}
	}

	/**
	 * Registers direct 1-on-1 chat room events
	 */
	registerChatRoomEvents(socket: Socket): void {
		socket.on('chat:join', async (payload: IChatRoomPayload | string) => {
			// Extract chatId safely whether payload is string or object
			const chatId = typeof payload === 'string' ? payload : payload?.chatId;
			await chatSocketService.joinRoom({ socket, chatId });
		});

		socket.on('chat:leave', async (payload: IChatRoomPayload | string) => {
			// Extract chatId safely whether payload is string or object
			const chatId = typeof payload === 'string' ? payload : payload?.chatId;
			await chatSocketService.leaveRoom({ socket, chatId });
		});
	}

	/**
	 * Registers direct messaging events
	 */
	sendMessageEvents(io: Server, socket: Socket): void {
		socket.on('message:send', async (payload: ISendMessagePayload) => {
			console.log('[Socket] event message:send called');
			await chatSocketService.sendMessage({ io, socket, payload });
		});
	}

	/**
	 * Registers group room and group messaging events
	 */
	registerGroupEvents(io: Server, socket: Socket): void {
		socket.on('group:join', async ({ roomId }: IGroupRoomPayload) => {
			await chatSocketService.joinGroup({ socket, roomId });
		});

		socket.on('group:leave', async ({ roomId }: IGroupRoomPayload) => {
			await chatSocketService.leaveGroup({ socket, roomId });
		});

		socket.on('group:send_message', async (payload: ISendGroupMessagePayload) => {
			await chatSocketService.sendGroupMessage({ io, socket, payload });
		});
	}

	/**
	 * Registers user typing status events
	 */
	registerTypingEvents(socket: Socket): void {
		socket.on('chat:typing', (data: IUserTypingPayload) => {
			const isTypingState = typeof data.isTyping === 'boolean' ? data.isTyping : true;
			chatSocketService.userTyping(socket, data.chatId, socket.user._id, isTypingState);
		});
	}

	/**
	 * Registers message status events (e.g., mark as read)
	 */
	registerMessageStatusEvents(io: Server, socket: Socket): void {
		socket.on('message:seen', async ({ senderId, chatId }: IMarkAsSeenPayload) => {
			await chatSocketService.markMessagesAsRead(io, socket, senderId, chatId);
		});
	}

	/**
	 * Centralized helper to initialize all event listeners for a socket
	 */
	registerAllEvents(io: Server, socket: Socket): void {
		this.registerPresenceEvents(io, socket);
		this.registerChatRoomEvents(socket);
		this.sendMessageEvents(io, socket);
		this.registerGroupEvents(io, socket);
		this.registerTypingEvents(socket);
		this.registerMessageStatusEvents(io, socket);
	}
}

export default new ChatEvents();
