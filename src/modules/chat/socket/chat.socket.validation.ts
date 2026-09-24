import { z } from 'zod';

export const attachmentSchema = z.object({
	id: z.string('Attachment ID is required' ),
	url: z.url('Invalid attachment URL'),
	type: z.enum(['image', 'video', 'raw', 'file']).optional(),
	name: z.string().optional(),
	size: z.number().positive().optional(),
});

// Helper validation logic to ensure at least content OR attachments exist
const validateMessagePayload = (data: { content?: string; attachments?: unknown[] }) => {
	const hasContent = Boolean(data.content && data.content.trim().length > 0);
	const hasAttachments = Boolean(data.attachments && data.attachments.length > 0);
	return hasContent || hasAttachments;
};


export const sendMessageSchema = z.object({
	chatId: z.string().optional(),
	content: z.string().min(1, 'Message content cannot be empty'),
	sendTo: z.string().min(1, 'Receiver ID is required'),
	clientTempId: z.string().optional(),
	// attachments: z.array(generalFields.file).optional(),
});

export const joinRoomSchema = z.object({
	chatId: z.string().min(1, 'Chat ID is required'),
});

export const joinGroupSchema = z.object({
	roomId: z.string().min(1, 'Room ID is required'),
});

export const sendGroupMessageSchema = z.object({
	groupId: z.string().min(1, 'Group ID is required'),
	content: z.string().min(1, 'Message content cannot be empty'),
	clientTempId: z.string().optional(),
});

export const typingSchema = z.object({
	chatId: z.string().min(1, 'Chat ID is required'),
	isTyping: z.boolean().optional(),
});

export const markAsSeenSchema = z.object({
	senderId: z.string().min(1, 'Sender ID is required'),
	chatId: z.string().min(1, 'Chat ID is required'),
});
