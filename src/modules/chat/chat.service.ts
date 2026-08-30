import { NotFoundException } from '../../shared/response/exception.response';
import { Id, IFile, IUserBody } from '../../shared/types';
import { IQueryDTO } from '../../shared/validation/general-fields.validation';
import { generateRandomToken } from '../../utils/security/otp-and-token';
import { blockRepository } from '../block';
import { messageRepository } from '../message';
import { selectGeneralUserInfo, userRepository } from '../user';
import chatRepository from './chat.repository';
import { ChatWUers, IChat } from './chat.types';
import { ICreateGroupDTO } from './chat.validation';

class ChatServices {
	constructor(
		private readonly ChatRepo = chatRepository,
		private readonly UserRepo = userRepository,
		private readonly MessageRepo = messageRepository,
		private readonly BlockRepo = blockRepository,
	) {}

	async getChatMessageList(userId: Id, chatId: string, { page = 1, limit = 10 }: IQueryDTO) {
		const chat = await this.ChatRepo.findOne({
			_id: chatId,
			// participation: { $in: [userId] },
		})
			.lean()
			.exec();

		if (!chat) {
			throw new NotFoundException('Chat not found', 'ChatServices.getChatMessageList');
		}

		const messages = await this.MessageRepo.find({ chat: chat._id })
			.lean()
			.sort({ createdAt: -1 })
			.populate<ChatWUers>([
				{ path: 'sender', select: selectGeneralUserInfo },
				{ path: 'receiver', select: selectGeneralUserInfo },
			])
			.paginate(page, limit)
			.exec();
		return messages;
	}

	async getChatList(userId: Id, { page = 1, limit = 10 }: IQueryDTO) {
		const chatList = await this.ChatRepo.find({
			participants: { $in: [userId] },
		})
			.lean()
			.sort({ lastMessageAt: -1 })
			.populate<ChatWUers>([
				{ path: 'lastMessageBy', select: selectGeneralUserInfo },
				{ path: 'participants', select: selectGeneralUserInfo, match: { _id: { $ne: userId } } },
			])
			.paginate(page, limit)
			.exec();

		return chatList;
	}

	async createGroup(user: IUserBody, body: ICreateGroupDTO, groupImg: IFile): Promise<IChat> {
		const { participants, groupName } = body;

		const blockedIds = await this.BlockRepo.getBlockedUsersIds(user._id);
		const users = await this.UserRepo.find({ _id: { $in: participants, $nin: blockedIds } })
			.lean()
			.select('_id')
			.exec();
		if (users.length !== participants.length) {
			throw new NotFoundException('User not found', 'ChatServices.createGroup');
		}

		const roomId = generateRandomToken(16);

		// TODO:upload group image
		const newGroup = await this.ChatRepo.create({
			groupName,
			roomId,
			participants: [user._id, ...users.map((u) => u._id)],
			createdBy: user._id,
		});

		return newGroup;
	}
}

export default new ChatServices();
