import EventEmitter from 'node:events';

// SafeEventEmitter typed class
export class TypedSafeEventEmitter<TEventMap extends Record<string, any>> extends EventEmitter {
	constructor() {
		super();
		// Catch unhandled errors in async events
		this.on('error', (err) => {
			console.error('❌ [SafeEventEmitter Error]:', err);
		});
	}

	// Fully-typed onAsync method
	onAsync<K extends keyof TEventMap & string>(event: K, callback: (payload: TEventMap[K]) => Promise<void>) {
		return this.on(event, async (payload: TEventMap[K]) => {
			try {
				await callback(payload);
			} catch (error) {
				console.error(`[Event Error] -> ${event}:`, error);
				this.emit('error', error);
			}
		});
	}

	// Fully-typed emit method
	emitAsync<K extends keyof TEventMap & string>(event: K, payload: TEventMap[K]): boolean {
		return this.emit(event, payload);
	}
}
