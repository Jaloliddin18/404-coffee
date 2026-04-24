import dotenv from 'dotenv';
dotenv.config({
	path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initializeSocket } from './libs/socket.handler';

mongoose
	.connect(process.env.MONGO_URL as string, {})
	.then((data) => {
		console.log('MongoDB connection succeed');

		const PORT = process.env.PORT ?? 3003;

		// Create HTTP server
		const httpServer = createServer(app);

		// Initialize Socket.io with CORS
		const io = new Server(httpServer, {
			cors: {
				origin: [
					'http://localhost:3000',
					'http://localhost:3002',
					'http://localhost:3006',
				],
				methods: ['GET', 'POST'],
				credentials: true,
			},
		});

		// Initialize socket handlers
		initializeSocket(io);

		httpServer.listen(PORT, function () {
			console.info(`The server is running successfully on port: ${PORT}`);
			console.info(`Admin project on http://localhost:${PORT}/admin`);
			console.info(`Socket.io initialized on the same port \n`);
		});
	})
	.catch((err) => console.log('Error on connection MongoDB', err));
