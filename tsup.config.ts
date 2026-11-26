import { defineConfig } from 'tsup';

export default defineConfig({
	// Entry point of the application
	entry: ['src/index.ts'],

	// Output format set strictly to ES Module
	format: ['esm'],

	// Disable code splitting to bundle everything into a single file
	splitting: false,
	sourcemap: false,
	clean: true,
	target: 'node18',

	// Bundle all internal relative modules
	bundle: true,
	minify: false,

	// External dependencies excluded from bundle
	external: ['express', 'mongoose', 'ioredis', 'socket.io', 'dotenv', 'argon2', 'bcrypt', 'file-type', 'firebase-admin'],
});
