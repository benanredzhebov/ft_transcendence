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
let gameEnded = false;

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
let resizeObserver: ResizeObserver | null = null; // ✅ NEW

function drawGame(state: GameState) {
	if (!ctx || !canvas) return;

	if (gameEnded) return;

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
	if (!socket || gameEnded) return;
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
	window.removeEventListener('resize', onResize); // ✅ CLEANUP
	window.removeEventListener('orientationchange', onResize); // ✅ CLEANUP
	window.removeEventListener('focus', onResize); // ✅ CLEANUP
	document.removeEventListener('visibilitychange', onResize); // ✅ CLEANUP
	resizeObserver?.disconnect(); // ✅ CLEANUP ResizeObserver
	resizeObserver = null;
}

function onResize() {
	if (canvas?.parentElement) {
		handleResize(canvas.parentElement);
	}
}

function showGameOverScreen(winner: string) {
	if (!canvas?.parentElement) return;

	gameEnded = true; // stop drawing and movement

	const	overlay = document.createElement('div');
	overlay.className = 'game-overlay';

	const message = document.createElement('div');
	message.className = 'game-message';
	message.textContent = `${winner} wins!`;

	const buttons = document.createElement('div');
	buttons.className = 'game-buttons';

	const restartBtn = document.createElement('button');
	restartBtn.textContent = "Restart game";
	restartBtn.onclick = () => {
		if (socket) {
			socket.emit('restart_game');
			gameEnded = false; //Allow movement and drawing again
			overlay.remove(); //Remove overlay from UI
			canvas?.focus();
		}
};

	const dashboardBtn = document.createElement('button');
	dashboardBtn.textContent = 'Back to Dashboard';
	dashboardBtn.onclick = () => {
		window.location.href = '/dashboard'; // route of the dashboard
	};

	buttons.appendChild(restartBtn);
	buttons.appendChild(dashboardBtn);

	overlay.appendChild(message);
	overlay.appendChild(buttons);
	canvas.parentElement.appendChild(overlay);
}

export function renderGame(containerId: string = 'app') {
	const container = document.getElementById(containerId);
	if (!container) return;

	container.innerHTML = '';
	gameEnded = false;

	// Show loading
	const loading = document.createElement('div');
	loading.textContent = 'Loading game...';
	loading.className = 'game-loading';
	container.appendChild(loading);

	// Apply the container styling
	container.className = 'game-container'

	// Create and style canvas
	canvas = document.createElement('canvas');
	canvas.className = 'game-canvas'; //Apply the CSS class for styling
	ctx = canvas.getContext('2d');
	container.appendChild(canvas);

	// Initial resize
	handleResize(container);
	// window.addEventListener('resize', () => handleResize(container));


	// ✅ RESIZE LISTENERS
	window.addEventListener('resize', onResize);
	window.addEventListener('orientationchange', onResize);
	window.addEventListener('focus', onResize);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') onResize();
	});

	// ✅ ResizeObserver for precision
	if (canvas?.parentElement) {
		resizeObserver = new ResizeObserver(() => {
		handleResize(container);
	});
	resizeObserver.observe(container);
	}

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('beforeunload', cleanupGame);

	socket = io('https://127.0.0.1:3000', {
		transports: ['websocket'],
		secure: true
	});
	console.log("Connecting to the WebSocket server...");

	socket.on('connect_error', (err) => {
		console.error('WebSocket connection error:', err.message);
	});

	// socket.on('connect', () => console.log('✅ Connected:', socket!.id));
	socket.on('connect', () => {
		console.log('✅ Connected:', socket!.id);
	
		//  Trigger a fresh game session
		socket!.emit('restart_game');
		gameEnded = false; // reset flag on reconnect
	});

	socket.on('disconnect', () => {
		console.warn('🔌 Disconnected from server');
		if (ctx && canvas) {
			ctx.fillStyle = 'red';
			ctx.font = '20px Arial';
			ctx.textAlign = 'center';
			ctx.fillText('Disconnected', canvas.width / 2, canvas.height / 2);
		}
	});

	// ✅ Ensure canvas is resized before every render
	socket.on('state_update', (state: GameState) => {
		const loading = document.querySelector(".game-loading");
		if (loading) loading.remove();

		if (canvas?.parentElement) handleResize(canvas.parentElement);
		requestAnimationFrame(() => drawGame(state));

		//Game over logic
		if (!gameEnded && (state.score.player1 >= 5 || state.score.player2 >= 5)) {
			const winner = state.score.player1 >= 5 ? 'Player 1' : 'Player 2';
			showGameOverScreen(winner);
			gameEnded = true;
		}
	});
}
