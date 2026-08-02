import EventEmitter from 'node:events';

export default class SafeEventEmitter extends EventEmitter {
	constructor() {
		super();
		this.on('error', (err) => {
			console.error('❌ [SafeEventEmitter Error]:', err);
		});
	}

	onAsync(event: string, callback: (...args: any[]) => Promise<void>) {
		return this.on(event, async (...args: any[]) => {
			try {
				await callback(...args);
			} catch (error) {
				console.error(`${event}:error`, error);
				this.emit('error', error);
			}
		});
	}
}

// todo: add logging for all events
// todo: add generic type for all events


