import { Server, Socket } from 'socket.io';
import { NotFoundException } from '../../shared/response/exception.response';
import { Id } from '../../shared/types';
import { redisConnectedSocket } from '../../utils/redis/connected-socket-service.redis';
import { blockRepository } from '../block';
import { friendRepository } from '../friend';
import { IMessage, messageRepository } from '../message';
import { IGeneralUser, userRepository } from '../user';
import chatRepository from './chat.repository';
import { ISendGroupMessagePayload, ISendMessagePayload } from './chat.types';

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
	 * Handles direct 1-on-1 messages with lazy chat initialization
	 */
	async sendMessage({ io, socket, payload }: { io: Server; socket: Socket; payload: ISendMessagePayload }): Promise<void> {
		try {
			const sender = socket.user._id;
			const { chatId, content, sendTo, clientTempId } = payload || {};

			const receiver = await userRepository.findById(sendTo).lean().exec();
			if (!receiver) {
				throw new NotFoundException('Receiver user not found', 'ChatSocketService.sendMessage');
			}

			// Check block status between users
			const blockedUserIds = await blockRepository.getBlockedUsersIds(sender);
			const isBlocked = blockedUserIds.some((id) => id.toString() === sendTo);
			if (isBlocked) {
				throw new NotFoundException('Cannot send message to this user', 'ChatSocketService.sendMessage');
			}

			// Sort participant IDs to enforce a unique canonical pair
			const participants = [sender.toString(), sendTo].sort();

			let chat = await chatRepository
				.findOne({
					groupName: { $exists: false },
					participants: { $all: participants },
					...(chatId ? { _id: chatId } : {}),
				})
				.lean()
				.exec();
			console.log('chat--', chat);

			if (!chat) {
				// throw new NotFoundException('Chat conversation not found', 'ChatSocketService.sendMessage');
				chat = await chatRepository.create({
					participants,
				});
			}

			const ChatId = chat._id.toString();

			// Ensure active socket joins target chat room
			socket.join(ChatId);

			const [message, _] = await Promise.all([
				messageRepository.create({
					sender,
					receiver: receiver._id,
					chat: ChatId,
					content,
				}),
				chatRepository
					.findByIdAndUpdate(ChatId, {
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
				.populate<IMessage & { sender: IGeneralUser; receiver: IGeneralUser }>([
					{ path: 'sender', select: 'firstName lastName avatar' },
					{ path: 'receiver', select: 'firstName lastName avatar' },
				])
				.exec();

			const messagePayload = {
				...populatedMessage,
				chatId: ChatId,
				clientTempId,
			};

			socket.emit('message:sent', messagePayload); // Acknowledge sender with sent message payload

			// Broadcast unified payload to room participants
			io.to(ChatId).emit('message:received', messagePayload);

			// Emit notification to receiver's direct personal user room
			io.to(receiver._id.toString()).emit('message:direct_notification', {
				chatId: ChatId,
				message: populatedMessage,
			});
		} catch (error) {
			console.error(error);
			socket.emit('chat:error', error);
		}
	}

	/**
	 * Join socket room by chatId
	 */
	async joinRoom({ socket, chatId }: { socket: Socket; chatId: string }): Promise<void> {
		if (!chatId) return;
		socket.join(chatId);
	}

	/**
	 * Leave socket room by chatId
	 */
	async leaveRoom({ socket, chatId }: { socket: Socket; chatId: string }): Promise<void> {
		if (!chatId) return;
		socket.leave(chatId);
	}

	/**
	 * Joins group room after verifying user membership
	 */
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
			socket.emit('chat:error', error);
		}
	}

	/**
	 * Leaves group room and removes user from participant list in database
	 */
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

			//TODO - Emit group leave notification to remaining participants if needed
			//TODO - Handle group deletion if no participants remain or no admins are left

			socket.leave(roomId);
		} catch (error) {
			socket.emit('chat:error', error);
		}
	}

	/**
	 * Sends group message with unified payload broadcast
	 */
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
				.populate<{ sender: IGeneralUser }>({ path: 'sender', select: 'firstName lastName avatar' })
				.exec();

			const messagePayload = {
				...populatedMessage,
				chatId: groupId,
				clientTempId,
			};

			io.to(groupId).emit('message:received', messagePayload);
		} catch (error) {
			socket.emit('chat:error', error);
		}
	}

	/**
	 * Checks if a user is online via Redis socket count
	 */
	async isUserOnline(userId: Id): Promise<boolean> {
		const activeCount = await redisConnectedSocket.getSocketCount(userId.toString());
		return activeCount > 0;
	}

	/**
	 * Emits typing indicator status to room subscribers except the typing user
	 */
	public async userTyping(socket: Socket, chatId: string, userId: Id, isTyping: boolean): Promise<void> {
		if (!chatId) return;

		socket.to(chatId).emit('chat:user_typing', {
			chatId,
			userId: userId.toString(),
			isTyping,
		});
	}

	/**
	 * Fetches current connected sockets count for a user
	 */
	async getUserSocketCount(io: Server, userId: Id): Promise<number> {
		return await redisConnectedSocket.getSocketCount(userId.toString());
	}

	/**
	 * Gets list of target user IDs excluding blocked users for presence updates
	 */
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

	/**
	 * Emits events to specified friend user rooms
	 */
	notifyFriends(io: Server, friendIds: Id[] | string[], event: string, payload: Record<string, unknown>): void {
		const targetRooms = friendIds?.map((id) => id.toString());
		if (targetRooms.length > 0) {
			io.to(targetRooms).emit(event, payload);
		}
	}

	/**
	 * Marks messages as read and emits confirmation event to sender
	 */
	async markMessagesAsRead(io: Server, socket: Socket, senderId: Id, chatId: string): Promise<void> {
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
