/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/09 10:37:25 by beredzhe          #+#    #+#             */
/*   Updated: 2025/05/09 10:37:25 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import './game.css';
import { io, Socket } from 'socket.io-client';


interface PaddleState {
	y: number;
	height: number;
	width: number;
}
interface BallState {
	x: number;
	y: number;
	radius: number;
}
interface GameState {
	paddles: { player1: PaddleState; player2: PaddleState };
	ball: BallState;
	score: { player1: number; player2: number };
}

const SERVER_WIDTH = 900;
const SERVER_HEIGHT = 600;

let socket: Socket | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function drawGame(state: GameState) {
	if (!ctx || !canvas) return;
	const scaleX = canvas.width / SERVER_WIDTH;
	const scaleY = canvas.height / SERVER_HEIGHT;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Background
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Paddles
	ctx.fillStyle = 'white';
	ctx.fillRect(0, state.paddles.player1.y * scaleY, 10 * scaleX, state.paddles.player1.height * scaleY);
	ctx.fillRect(
		canvas.width - 10 * scaleX,
		state.paddles.player2.y * scaleY,
		10 * scaleX,
		state.paddles.player2.height * scaleY
	);

	// Ball
	ctx.fillStyle = 'yellow';
	ctx.beginPath();
	ctx.arc(
		state.ball.x * scaleX,
		state.ball.y * scaleY,
		state.ball.radius * Math.min(scaleX, scaleY),
		0,
		Math.PI * 2
	);
	ctx.fill();

	// Draw score
	ctx.fillStyle = 'green';
	ctx.font = `${40 * Math.min(scaleX, scaleY)}px Arial`;
	ctx.textAlign = 'center';
	ctx.fillText(
	`${state.score.player1} : ${state.score.player2}`,
	canvas.width / 2,
	50 * scaleY
);

}

function handleResize(container: HTMLElement) {
	if (!canvas) return;

	const aspectRatio = SERVER_WIDTH / SERVER_HEIGHT;
	let newWidth = container.clientWidth;
	let newHeight = newWidth / aspectRatio;
	if (newHeight > container.clientHeight) {
		newHeight = container.clientHeight;
		newWidth = newHeight * aspectRatio;
	}
	canvas.width = newWidth;
	canvas.height = newHeight;
}

function handleKeyDown(e: KeyboardEvent) {
	if (!socket) return;
	const key = e.key.toLowerCase();
	if (key === 'w') socket.emit('player_move', { playerId: 'player1', direction: 'up' });
	if (key === 's') socket.emit('player_move', { playerId: 'player1', direction: 'down' });
	if (key === 'arrowup') socket.emit('player_move', { playerId: 'player2', direction: 'up' });
	if (key === 'arrowdown') socket.emit('player_move', { playerId: 'player2', direction: 'down' });
}

function cleanupGame() {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
	window.removeEventListener('keydown', handleKeyDown);
}

export function renderGame(containerId: string = 'app') {
	//console.log("🕹️ render game Called");
	const container = document.getElementById(containerId);
	if (!container) return;

	// Clear previous content
	container.innerHTML = '';

	// Create and style canvas. Using the HTML5 Canvas API directly
	canvas = document.createElement('canvas');
	canvas.className = 'border-2 border-white rounded';
	ctx = canvas.getContext('2d');
	container.appendChild(canvas);

	// Resize canvas to fit
	handleResize(container);
	window.addEventListener('resize', () => handleResize(container));
	window.addEventListener('keydown', handleKeyDown);

	// Cleanup when navigating away
	window.addEventListener('beforeunload', cleanupGame);

	// Connect to server
	//connects frontend to the backend
	socket = io('https://127.0.0.1:3000', {
		transports: ['websocket'], 
		secure: true
	});
	
	console.log("Connecting to the WebSocket server...")

	// Added connect error listener
	socket.on('connect_error', (err) => {
		console.error('WebSocket connection error:', err.message);
	});

	//This is real-time WebSocket-based multiplayer support, implemented manually (not through any UI framework).
	socket!.on('connect', () => console.log('✅ Connected:', socket!.id));
	//Disconnect listener here
	socket.on('disconnect', () => {
		console.warn('🔌 Disconnected from server');
		if (ctx && canvas) {
			console.log('Canvas and context are available for rendering');
			ctx.fillStyle = 'red';
			ctx.font = '20px Arial';
			ctx.textAlign = 'center';
			ctx.fillText('Disconnected', canvas.width / 2, canvas.height / 2);
		}
	});
	socket.on('state_update', (state: GameState) => {
		console.log('State received:', state); // Just to check, should be delete later
		console.log("🎾 Ball State:", state.ball);
		requestAnimationFrame(() => drawGame(state));
	});
}