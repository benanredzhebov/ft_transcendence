import React, { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://localhost:3000'); // Adjust port if needed

export const GameCanvas: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		console.log('Canvas Ref:', canvasRef.current);
		const ctx = canvasRef.current?.getContext('2d');

		if (!ctx) {
			console.error('Failed to get canvas context');
			return;
		}
		// Listen for state updates from the server
		socket.on('state_update', (state) => {
			// console.log('Received state update:', state); //delete it later
			ctx.clearRect(0, 0, 900, 600);

			ctx.fillStyle = 'black';
			ctx.fillRect(0, 0, 900, 600);

			// Draw paddles
			ctx.fillStyle = 'white';
			ctx.fillRect(0, state.paddles.player1.y, 10, state.paddles.player1.height);
			ctx.fillRect(890, state.paddles.player2.y, 10, state.paddles.player2.height);

			// Draw ball
			ctx.fillStyle = 'white';
			ctx.beginPath();
			ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
			ctx.fill();
		});
		// Cleanup the WebSocket listener when the component unmounts
		return () => {
			socket.off('state_update');
		};
	}, []);

	// Handle keyboard input
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') socket.emit('player_move', { playerId: 'player2', direction: 'up' });
			if (e.key === 'ArrowDown') socket.emit('player_move', { playerId: 'player2', direction: 'down' });
			if (e.key === 'w') socket.emit('player_move', { playerId: 'player1', direction: 'up' });
			if (e.key === 's') socket.emit('player_move', { playerId: 'player1', direction: 'down' });
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	return (
		<div className="flex justify-center">
			<canvas ref={canvasRef} width={900} height={600} className="border border-black" />
		</div>
	);
};

export default GameCanvas;