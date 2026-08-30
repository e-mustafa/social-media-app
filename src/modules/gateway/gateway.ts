import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { whiteList } from '../../config/cors.config';
import { IUserBody } from '../../shared/types';
import { redisConnectedSocket } from '../../utils/redis/connected-socket-service.redis';
import { decodeToken } from '../../utils/security/token/token';
import chatGateway from '../chat/chat.gateway';

// const connectedSockets: Map<string, string[]> = new Map<string, string[]>(); // socketId: [userId1, userId2, ...][] = [];

export const initializeIo = (httpServer: HttpServer) => {
	const io = new Server(httpServer, { cors: { origin: whiteList } });

	io.use((socket, next) => {
		try {
			const token = socket.handshake.auth.token;
			const token2 = socket.handshake.headers.authorization;

			console.log('token', token);
			console.log('token2', token2);

			if (!token && !token2) {
				return next(new Error('Authentication error'));
			}

			const { user } = decodeToken(token || token2);
			socket.user = user as IUserBody;
			next();
		} catch (error) {
			console.error('Authentication error:', error);
			// socket.emit('error', error);
			next(error as Error);
		}
	});

	io.on('connect', (socket: Socket) => {
		console.log('New connection detected');
		registerUser(socket);
		console.log('socket.id', socket.id);
		// console.log('connectedSockets', connectedSockets);

		chatGateway.register(socket);

		socket.on('disconnect', () => {
			console.log('user disconnected', socket.id);
			revokeUser(socket);
			// console.log('connectedSockets', connectedSockets);
		});
	});
};

const registerUser = async (socket: Socket) => {
	const userId = socket.user._id.toString();
	// connectedSockets.set(userId, [...(connectedSockets.get(userId) ?? []), socket.id]);

	const userSockets = (await redisConnectedSocket.get(userId)) || [];
	await redisConnectedSocket.set(userId, [...userSockets, socket.id]);
};

const revokeUser = async (socket: Socket) => {
	const userId = socket.user._id.toString();
	// const userSockets = (connectedSockets.get(userId) || []).filter((id) => id !== socket.id);

	// if (userSockets.length === 0) {
	// 	connectedSockets.delete(userId);
	// } else {
	// 	connectedSockets.set(userId, userSockets);
	// }

	const userSockets = (await redisConnectedSocket.get(userId)) || [];
	if (userSockets.length === 0) {
		await redisConnectedSocket.delete(userId);
	} else {
		await redisConnectedSocket.set(
			userId,
			userSockets.filter((id) => id !== socket.id),
		);
	}
};
