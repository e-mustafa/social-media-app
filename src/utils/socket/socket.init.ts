import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { whiteList } from '../../config/cors.config';
import chatGateway from '../../modules/chat/chat.socket.gateway';
import { userRepository } from '../../modules/user';
import { UnAuthorizedException } from '../../shared/response/exception.response';
import { IUserBody } from '../../shared/types';
import { decodeToken } from '../security/token/token';

// const connectedSockets: Map<string, string[]> = new Map<string, string[]>(); // socketId: [userId1, userId2, ...][] = [];

let io: Server | null = null;

const initializeSocket = (httpServer: HttpServer) => {
	console.log('initializeSocket');
	io = new Server(httpServer, {
		cors: { origin: whiteList },
		pingTimeout: 5000, // Wait 5 seconds for pong response before disconnecting
		pingInterval: 10000, // Send a ping every 10 seconds
	});

	// socket middleware (auth)
	io.use(async (socket, next) => {
		try {
			const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

			if (!token) {
				return next(new Error('Authentication error'));
			}

			const decoded = decodeToken(token);
			
			const user: IUserBody | null = await userRepository
				.findById(decoded.id)
				.lean()
				.select('-friends -blockedUsers -password')
				.exec();
			if (!user) {
				throw new UnAuthorizedException('User account not found or inactive', 'initializeSocket');
			}

			socket.user = user as IUserBody;
			next();
		} catch (error) {
			console.error('Authentication error:', error);
			// socket.emit('error', error);
			next(error as Error);
			// next(new Error((error as Error).message || 'Authentication error'));
		}
	});

	io.on('connection', (socket: Socket) => {
		// console.log(`[Socket] Connected: ${socket.user.firstName} (Socket ID: ${socket.id})`);

		// Join a private room dedicated to the logged-in user
		socket.join(socket.user._id.toString());

		// Register gateway events
		chatGateway.register(io!, socket);
	});
};

export { initializeSocket, io };
