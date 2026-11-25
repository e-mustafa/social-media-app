import { Server, Socket } from 'socket.io';
import handleEventWValidation from '../../../providers/socket/socket.validator';
import { userRepository } from '../../user';
import {
	IChatRoomPayload,
	IGroupRoomPayload,
	IMarkAsSeenPayload,
	ISendGroupMessagePayload,
	ISendMessagePayload,
	IUserTypingPayload,
} from '../chat.types';
import chatSocketService from './chat.socket.service';
import {
	joinGroupSchema,
	joinRoomSchema,
	markAsSeenSchema,
	sendGroupMessageSchema,
	sendMessageSchema,
	typingSchema,
} from './chat.socket.validation';

class ChatEvents {
	/**
	 * Registers user presence events (online/offline status)
	 */
	async registerPresenceEvents(io: Server, socket: Socket): Promise<void> {
		try {
			const user = socket.user;
			if (!user) {
				socket.emit('chat:error', { event: 'connection', error: 'Unauthorized socket user' });
				return;
			}

			const userId = user._id.toString();
			console.log(`[Socket] Connected: ${user.firstName} (Socket ID: ${socket.id})`);

			const isFirstDevice = await chatSocketService.registerUser(socket);
			if (isFirstDevice) {
				const usersIds = await chatSocketService.getFriendsAndChatUsers(userId);
				chatSocketService.notifyFriends(io, usersIds, 'user:online', { userId, online: true });
			}

			socket.on('disconnect', async (): Promise<void> => {
				try {
					console.log(`[Socket] Disconnected: ${user.firstName} (Socket ID: ${socket.id})`);

					const isLastDevice = await chatSocketService.revokeUser(socket);
					if (!isLastDevice) return;

					const lastSeenAt = new Date();
					await userRepository.updateOne({ _id: userId }, { lastSeenAt });

					const usersIds = await chatSocketService.getFriendsAndChatUsers(userId);
					chatSocketService.notifyFriends(io, usersIds, 'user:offline', {
						userId,
						online: false,
						lastSeenAt,
					});
				} catch (error: unknown) {
					socket.emit('chat:error', {
						event: 'disconnect',
						error: error instanceof Error ? error.message : 'Disconnect error',
					});
				}
			});
		} catch (error: unknown) {
			socket.emit('chat:error', {
				event: 'connection',
				error: error instanceof Error ? error.message : 'Connection error',
			});
		}
	}

	/**
	 * Registers direct 1-on-1 chat room events
	 */
	registerChatRoomEvents(socket: Socket): void {
		socket.on(
			'chat:join',
			handleEventWValidation(socket, 'chat:join', joinRoomSchema, async (payload: IChatRoomPayload): Promise<void> => {
				await chatSocketService.joinRoom({ socket, chatId: payload.chatId });
			}),
		);

		socket.on(
			'chat:leave',
			handleEventWValidation(socket, 'chat:leave', joinRoomSchema, async (payload: IChatRoomPayload): Promise<void> => {
				await chatSocketService.leaveRoom({ socket, chatId: payload.chatId });
			}),
		);
	}

	/**
	 * Registers direct messaging events
	 */
	sendMessageEvents(io: Server, socket: Socket): void {
		socket.on(
			'message:send',
			handleEventWValidation(
				socket,
				'message:send',
				sendMessageSchema,
				async (payload: ISendMessagePayload): Promise<void> => {
					await chatSocketService.sendMessage({ io, socket, payload });
				},
			),
		);
	}

	/**
	 * Registers group room and group messaging events
	 */
	registerGroupEvents(io: Server, socket: Socket): void {
		socket.on(
			'group:join',
			handleEventWValidation(
				socket,
				'group:join',
				joinGroupSchema,
				async ({ roomId }: IGroupRoomPayload): Promise<void> => {
					await chatSocketService.joinGroup({ socket, roomId });
				},
			),
		);

		socket.on(
			'group:leave',
			handleEventWValidation(
				socket,
				'group:leave',
				joinGroupSchema,
				async ({ roomId }: IGroupRoomPayload): Promise<void> => {
					await chatSocketService.leaveGroup({ socket, roomId });
				},
			),
		);

		socket.on(
			'group:send_message',
			handleEventWValidation(
				socket,
				'group:send_message',
				sendGroupMessageSchema,
				async (payload: ISendGroupMessagePayload): Promise<void> => {
					await chatSocketService.sendGroupMessage({ io, socket, payload });
				},
			),
		);
	}

	/**
	 * Registers user typing status events
	 */
	registerTypingEvents(socket: Socket): void {
		socket.on(
			'chat:typing',
			handleEventWValidation(socket, 'chat:typing', typingSchema, async (data: IUserTypingPayload): Promise<void> => {
				if (!socket.user) return;
				const isTypingState = typeof data.isTyping === 'boolean' ? data.isTyping : true;
				chatSocketService.userTyping(socket, data.chatId, socket.user._id, isTypingState);
			}),
		);
	}

	/**
	 * Registers message status events (e.g., mark as read)
	 */
	registerMessageStatusEvents(io: Server, socket: Socket): void {
		socket.on(
			'message:seen',
			handleEventWValidation(
				socket,
				'message:seen',
				markAsSeenSchema,
				async ({ senderId, chatId }: IMarkAsSeenPayload): Promise<void> => {
					await chatSocketService.markMessagesAsRead(io, socket, senderId, chatId);
				},
			),
		);
	}

	/**
	 * Centralized helper to initialize all event listeners for a socket
	 */
	registerAllEvents(io: Server, socket: Socket): void {
		void this.registerPresenceEvents(io, socket);
		this.registerChatRoomEvents(socket);
		this.sendMessageEvents(io, socket);
		this.registerGroupEvents(io, socket);
		this.registerTypingEvents(socket);
		this.registerMessageStatusEvents(io, socket);
	}
}

export default new ChatEvents();
