import express from 'express';
import app from './dist/index.js';

// Ensure Vercel detects this file as an Express application.
if (typeof express !== 'function' || typeof app !== 'function') {
	throw new TypeError('Invalid Express application export.');
}

export default app;
