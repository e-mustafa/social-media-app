import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/dev.ts',
	},

	outDir: 'dist',

	format: ['esm'],

	platform: 'node',

	target: 'node20',

	bundle: true,
	splitting: false,

	sourcemap: false,
	clean: true,
	minify: false,

	external: ['express', 'mongoose', 'ioredis', 'socket.io', 'dotenv', 'argon2', 'bcrypt', 'file-type', 'firebase-admin'],
});
