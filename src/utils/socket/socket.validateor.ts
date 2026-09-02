import { Socket } from 'socket.io';
import { output, ZodType } from 'zod';

const handleEventWValidation = <TSchema extends ZodType>(
	socket: Socket,
	eventName: string,
	schema: TSchema | undefined,
	handler: (data: output<TSchema>) => Promise<unknown> | unknown,
) => {
	return async (payload: unknown) => {
		try {
			if (schema) {
				const result = schema.safeParse(payload);
				if (!result.success) {
					const message = result.error.issues[0]?.message || 'Invalid request payload';
					console.error(`[Socket Validation Error] Event: ${eventName}`, result.error.format());
					socket.emit('chat:error', { event: eventName, error: message });
					return;
				}
				await handler(result.data);
			} else {
				await handler(payload as output<TSchema>);
			}
		} catch (error) {
			console.error(`[Socket Execution Error] Event: ${eventName}`, error);
			socket.emit('chat:error', {
				event: eventName,
				error: (error as Error).message || 'An unexpected server error occurred',
			});
		}
	};
};

export default handleEventWValidation;
