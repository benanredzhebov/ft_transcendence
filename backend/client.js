import { io } from 'socket.io-client';

const socket = io('https://127.0.0.1:3000', { secure: true });

socket.on('connect', () => {
	console.log('Connected to server:', socket.id);

	// Emit the register_user event with a userId
	socket.emit('register_user', { userId: 'player123' });
});

socket.on('state_update', (gameState) => {
	console.log('Game state updated:', gameState);
	// Update the game view here
});

socket.on('disconnect', () => {
	console.log('Disconnected from server');
});