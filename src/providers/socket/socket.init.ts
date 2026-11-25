import chalk from 'chalk';
import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { whiteList } from '../../config/cors.config';
import chatSocketGateway from '../../modules/chat/socket/chat.socket.gateway';
import { userRepository } from '../../modules/user';
import { UnAuthorizedException } from '../../shared/response/exception.response';
import { IUserBody } from '../../shared/types';
import { decodeToken } from '../security/token/token';

let io: Server | null = null;

const initializeSocket = (httpServer: HttpServer): void => {
	console.log(chalk.green('✔ Socket initialized successfully 🗣'));

	io = new Server(httpServer, {
		cors: { origin: whiteList },
		pingTimeout: 5000, // Wait 5 seconds for pong response before disconnecting
		pingInterval: 10000, // Send a ping every 10 seconds
	});

	// Authenticate socket connection before registering event listeners
	io.use(async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
		try {
			const authToken =
				typeof socket.handshake.auth?.token === 'string'
					? socket.handshake.auth.token
					: socket.handshake.headers.authorization;

			if (!authToken) {
				next(new Error('Authentication error'));
				return;
			}

			const decoded = decodeToken(authToken);

			const user: IUserBody | null = await userRepository
				.findById(decoded.id)
				.lean()
				.select('-friends -blockedUsers -password')
				.exec();

			if (!user) {
				throw new UnAuthorizedException('User account not found or inactive', 'initializeSocket');
			}

			socket.user = user;
			next();
		} catch (error: unknown) {
			console.error('Authentication error:', error);
			next(error instanceof Error ? error : new Error('Authentication error'));
		}
	});

	io.on('connection', (socket: Socket): void => {
		if (!socket.user) {
			socket.disconnect(true);
			return;
		}

		// Join a private room dedicated to the logged-in user
		socket.join(socket.user._id.toString());

		// Register gateway events using standard Socket type
		if (io) {
			chatSocketGateway.register(io, socket);
		}
	});
};

export { initializeSocket, io };
