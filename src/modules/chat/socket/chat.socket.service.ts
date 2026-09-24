import { Server, Socket } from 'socket.io';
import { redisConnectedSocket } from '../../../providers/redis/connected-socket-service.redis';
import { NotFoundException } from '../../../shared/response/exception.response';
import { Id } from '../../../shared/types';
import { blockRepository } from '../../block';
import { friendRepository } from '../../friend';
import { messageRepository } from '../../message';
import { userRepository } from '../../user';
import chatRepository from '../chat.repository';
import { ISendGroupMessagePayload, ISendMessagePayload } from '../chat.types';

class ChatSocketService {
	/**
	 * Registers user connection in Redis and joins personal user socket room
	 */
	async registerUser(socket: Socket): Promise<boolean> {
		const userId = socket.user._id.toString();
		socket.join(userId);
		return await redisConnectedSocket.addSocket(userId, socket.id);
	}

	/**
	 * Revokes user connection from Redis and leaves personal socket room
	 */
	async revokeUser(socket: Socket): Promise<boolean> {
		const userId = socket.user._id.toString();
		socket.leave(userId);
		return await redisConnectedSocket.removeSocket(userId, socket.id);
	}

	/**
	 * Handles direct 1-on-1 messages with lazy chat initialization & bidirectional block checks
	 */
	async sendMessage({ io, socket, payload }: { io: Server; socket: Socket; payload: ISendMessagePayload }): Promise<void> {
		try {
			const sender = socket.user._id;
			const { chatId, content, sendTo, clientTempId } = payload;

			const receiver = await userRepository.findById(sendTo).lean().exec();
			if (!receiver) {
				throw new NotFoundException('Receiver user not found', 'ChatSocketService.sendMessage');
			}

			// Bi-directional block validation
			const [senderBlockedIds, receiverBlockedIds] = await Promise.all([
				blockRepository.getBlockedUsersIds(sender),
				blockRepository.getBlockedUsersIds(receiver._id),
			]);

			const isBlocked =
				senderBlockedIds.some((id) => id.toString() === sendTo) ||
				receiverBlockedIds.some((id) => id.toString() === sender.toString());

			if (isBlocked) {
				throw new NotFoundException('Cannot send message to this user', 'ChatSocketService.sendMessage');
			}

			const participants = [sender.toString(), sendTo].sort();

			let chat = await chatRepository
				.findOne({
					groupName: { $exists: false },
					participants: { $all: participants },
					...(chatId ? { _id: chatId } : {}),
				})
				.lean()
				.exec();

			if (!chat) {
				chat = await chatRepository.create({ participants });
			}

			const activeChatId = chat._id.toString();
			socket.join(activeChatId);

			const [message] = await Promise.all([
				messageRepository.create({
					sender,
					receiver: receiver._id,
					chat: activeChatId,
					content,
				}),
				chatRepository
					.findByIdAndUpdate(activeChatId, {
						lastMessage: content,
						lastMessageAt: new Date(),
						lastMessageBy: sender,
					})
					.lean()
					.exec(),
			]);

			const populatedMessage = await messageRepository
				.findById(message._id)
				.lean()
				.populate([
					{ path: 'sender', select: 'firstName lastName avatar' },
					{ path: 'receiver', select: 'firstName lastName avatar' },
				])
				.exec();

			const messagePayload = {
				...populatedMessage,
				chatId: activeChatId,
				clientTempId,
			};

			// Acknowledge sender
			socket.emit('message:sent', messagePayload);

			// Broadcast to active room participants
			io.to(activeChatId).emit('message:received', messagePayload);

			// Direct alert notification to receiver's socket room
			io.to(receiver._id.toString()).emit('message:direct_notification', {
				chatId: activeChatId,
				message: populatedMessage,
			});
		} catch (error) {
			console.error('[Socket Error - sendMessage]:', error);
			socket.emit('chat:error', { event: 'message:send', error: (error as Error).message });
		}
	}

	async joinRoom({ socket, chatId }: { socket: Socket; chatId: string }): Promise<void> {
		if (chatId) socket.join(chatId);
	}

	async leaveRoom({ socket, chatId }: { socket: Socket; chatId: string }): Promise<void> {
		if (chatId) socket.leave(chatId);
	}

	async joinGroup({ socket, roomId }: { socket: Socket; roomId: string }): Promise<void> {
		try {
			const group = await chatRepository
				.findOne({ roomId, groupName: { $exists: true }, participants: { $in: [socket.user._id] } })
				.lean()
				.exec();

			if (!group) {
				throw new NotFoundException('Group not found or access denied', 'ChatSocketService.joinGroup');
			}

			socket.join(roomId);
		} catch (error) {
			socket.emit('chat:error', { event: 'group:join', error: (error as Error).message });
		}
	}

	async leaveGroup({ socket, roomId }: { socket: Socket; roomId: string }): Promise<void> {
		try {
			const group = await chatRepository
				.findOneAndUpdate(
					{ roomId, groupName: { $exists: true }, participants: { $in: [socket.user._id] } },
					{ $pull: { participants: socket.user._id } },
				)
				.lean()
				.exec();

			if (!group) {
				throw new NotFoundException('Group not found or access denied', 'ChatSocketService.leaveGroup');
			}

			socket.leave(roomId);
		} catch (error) {
			socket.emit('chat:error', { event: 'group:leave', error: (error as Error).message });
		}
	}

	async sendGroupMessage({
		io,
		socket,
		payload,
	}: {
		io: Server;
		socket: Socket;
		payload: ISendGroupMessagePayload;
	}): Promise<void> {
		try {
			const { groupId, content, clientTempId } = payload;
			const senderId = socket.user._id;

			const group = await chatRepository
				.findOne({ _id: groupId, groupName: { $exists: true }, participants: { $in: [senderId] } })
				.lean()
				.exec();

			if (!group) {
				throw new NotFoundException('Group not found or access denied', 'ChatSocketService.sendGroupMessage');
			}

			const message = await messageRepository.create({
				sender: senderId,
				chat: group._id,
				content,
			});

			const populatedMessage = await messageRepository
				.findById(message._id)
				.lean()
				.populate({ path: 'sender', select: 'firstName lastName avatar' })
				.exec();

			const messagePayload = {
				...populatedMessage,
				chatId: groupId,
				clientTempId,
			};

			io.to(groupId).emit('message:received', messagePayload);
		} catch (error) {
			socket.emit('chat:error', { event: 'group:send_message', error: (error as Error).message });
		}
	}

	async isUserOnline(userId: Id): Promise<boolean> {
		const activeCount = await redisConnectedSocket.getSocketCount(userId.toString());
		return activeCount > 0;
	}

	async userTyping(socket: Socket, chatId: string, userId: Id, isTyping: boolean): Promise<void> {
		if (!chatId) return;
		socket.to(chatId).emit('chat:user_typing', {
			chatId,
			userId: userId.toString(),
			isTyping,
		});
	}

	async getUserSocketCount(io: Server, userId: Id): Promise<number> {
		return await redisConnectedSocket.getSocketCount(userId.toString());
	}

	async getFriendsAndChatUsers(userId: Id): Promise<string[]> {
		const [friendsAndChatUsers, blockedIds, friendIds] = await Promise.all([
			chatRepository
				.find({ participants: { $in: [userId] } })
				.lean()
				.select('participants')
				.exec(),
			blockRepository.getBlockedUsersIds(userId),
			friendRepository.getFriendIds(userId),
		]);

		const chatUsers = friendsAndChatUsers.flatMap((chat) =>
			chat.participants.filter((participant) => participant.toString() !== userId.toString()),
		);

		const usersIds = Array.from(new Set([...chatUsers, ...friendIds].map((id) => id.toString())));

		const filteredUsers = await userRepository
			.find({ _id: { $in: usersIds, $nin: blockedIds } })
			.lean()
			.select('_id')
			.exec();

		return filteredUsers.map((user) => user._id.toString());
	}

	notifyFriends(io: Server, friendIds: Id[] | string[], event: string, payload: Record<string, unknown>): void {
		const targetRooms = friendIds?.map((id) => id.toString());
		if (targetRooms && targetRooms.length > 0) {
			io.to(targetRooms).emit(event, payload);
		}
	}

	async markMessagesAsRead(io: Server, socket: Socket, senderId: Id | string, chatId: string): Promise<void> {
		const readAt = new Date();
		const userId = socket.user._id;

		const result = await messageRepository.updateMany(
			{ sender: senderId, receiver: userId, chat: chatId, readAt: { $exists: false } },
			{ readAt },
		);

		if (result.modifiedCount > 0) {
			io.to(senderId.toString()).emit('message:seen', {
				by: userId,
				count: result.modifiedCount,
				readAt,
				chatId,
			});
		}
	}
}

export default new ChatSocketService();
