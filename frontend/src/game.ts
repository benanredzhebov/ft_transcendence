// // filepath: c:\Users\piero\Desktop\ft_trascendence\frontend\src\game.ts
// import { io, Socket } from 'socket.io-client';

// interface PaddleState {
//   y: number;
//   height: number;
//   width: number;
// }

// interface BallState {
//   x: number;
//   y: number;
//   radius: number;
// }

// interface GameState {
//   paddles: {
//     player1: PaddleState;
//     player2: PaddleState;
//   };
//   ball: BallState;
//   score: {
//     player1: number;
//     player2: number;
//   };
// }

// const SERVER_WIDTH = 900;
// const SERVER_HEIGHT = 600;

// let socket: Socket | null = null;
// let canvas: HTMLCanvasElement | null = null;
// let ctx: CanvasRenderingContext2D | null = null;
// let animationFrameId: number | null = null;

// function drawGame(state: GameState) {
//   if (!ctx || !canvas) return;

//   const width = canvas.width;
//   const height = canvas.height;
//   const scaleX = width / SERVER_WIDTH;
//   const scaleY = height / SERVER_HEIGHT;

//   ctx.clearRect(0, 0, width, height);

//   // Background
//   const gradient = ctx.createLinearGradient(0, 0, 0, height);
//   gradient.addColorStop(0, '#1a1a2e');
//   gradient.addColorStop(1, '#16213e');
//   ctx.fillStyle = gradient;
//   ctx.fillRect(0, 0, width, height);

//   // Paddles with shadows
//   ctx.shadowColor = 'rgba(0,0,0,0.5)';
//   ctx.shadowBlur = 4;
//   ctx.fillStyle = 'white';
//   ctx.fillRect(0, state.paddles.player1.y * scaleY, 10 * scaleX, state.paddles.player1.height * scaleY);
//   ctx.fillRect(width - 10 * scaleX, state.paddles.player2.y * scaleY, 10 * scaleX, state.paddles.player2.height * scaleY);
//   ctx.shadowBlur = 0;

//   // Ball
//   ctx.fillStyle = 'yellow';
//   ctx.beginPath();
//   ctx.arc(state.ball.x * scaleX, state.ball.y * scaleY, state.ball.radius * Math.min(scaleX, scaleY), 0, Math.PI * 2);
//   ctx.fill();
// }

// function handleResize(container: HTMLElement) {
//   if (!canvas) return;

//   const { clientWidth, clientHeight } = container;
//   const aspectRatio = SERVER_WIDTH / SERVER_HEIGHT;

//   let newWidth = clientWidth;
//   let newHeight = newWidth / aspectRatio;
//   if (newHeight > clientHeight) {
//     newHeight = clientHeight;
//     newWidth = newHeight * aspectRatio;
//   }

//   canvas.width = newWidth;
//   canvas.height = newHeight;
// }

// function handleKeyDown(e: KeyboardEvent) {
//   if (!socket) return;
//   const key = e.key.toLowerCase();
//   if (key === 'arrowup') socket.emit('player_move', { playerId: 'player2', direction: 'up' });
//   if (key === 'arrowdown') socket.emit('player_move', { playerId: 'player2', direction: 'down' });
//   if (key === 'w') socket.emit('player_move', { playerId: 'player1', direction: 'up' });
//   if (key === 's') socket.emit('player_move', { playerId: 'player1', direction: 'down' });
// }

// function cleanup() {
//   if (animationFrameId) cancelAnimationFrame(animationFrameId);
//   if (socket) {
//     socket.off('state_update');
//     socket.disconnect();
//     socket = null;
//   }
//   window.removeEventListener('resize', resizeListener);
//   window.removeEventListener('keydown', handleKeyDown);
// }

// let resizeListener: () => void;

// export function renderGame(containerId: string = 'game-container') {
//   cleanup(); // in case of re-render

//   const container = document.getElementById(containerId);
//   if (!container) {
//     console.error(`Container with ID "${containerId}" not found.`);
//     return;
//   }

//   // Create canvas
//   canvas = document.createElement('canvas');
//   canvas.style.border = '2px solid black';
//   ctx = canvas.getContext('2d');
//   if (!ctx) {
//     container.innerHTML = '<p>Canvas not supported</p>';
//     return;
//   }

//   container.innerHTML = '';
//   container.appendChild(canvas);

//   // Initial resize
//   resizeListener = () => handleResize(container);
//   resizeListener();
//   window.addEventListener('resize', resizeListener);
//   window.addEventListener('keydown', handleKeyDown);

//   // Setup socket
//   socket = io(); // connects to same origin
//   socket.on('connect', () => console.log('✅ Connected:', socket?.id));
//   socket.on('state_update', (state: GameState) => {
//     animationFrameId = requestAnimationFrame(() => drawGame(state));
//   });

//   socket.on('connect_error', (err) => {
//     console.error('❌ WebSocket error:', err.message);
//     if (ctx) {
//       ctx.fillStyle = 'red';
//       ctx.font = '24px Arial';
//       ctx.textAlign = 'center';
//       ctx.fillText('Connection Error', canvas!.width / 2, canvas!.height / 2);
//     }
//   });

//   socket.on('disconnect', () => {
//     console.log('🔌 Disconnected');
//   });
// }

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

export function renderGame(containerId: string = 'app') {
	const container = document.getElementById(containerId);
	if (!container) return;

	// Clear previous content
	container.innerHTML = '';

	// Create and style canvas
	canvas = document.createElement('canvas');
	canvas.className = 'border-2 border-white rounded';
	ctx = canvas.getContext('2d');
	container.appendChild(canvas);

	// Resize canvas to fit
	handleResize(container);
	window.addEventListener('resize', () => handleResize(container));
	window.addEventListener('keydown', handleKeyDown);

	// Connect to server
	socket = io(); // Uses same origin
	socket!.on('connect', () => console.log('✅ Connected:', socket!.id));
	socket.on('state_update', (state: GameState) => {
		requestAnimationFrame(() => drawGame(state));
	});
}
