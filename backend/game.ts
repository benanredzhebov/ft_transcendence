    // the browsare dosn t know import or require
// import { io } from 'socket.io-client'; // Import the `io` function

    // DID THAT TO CONNECT WITH THE GAME
declare const io: any;

// Connect to the WebSocket server
const socket = io('https://127.0.0.1:3000'); // Adjust port if needed

// Create and configure the canvas
const canvas = document.createElement('canvas');
canvas.width = 900;
canvas.height = 600;
canvas.style.border = '1px solid black';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
if (!ctx) {
    throw new Error('Failed to get canvas context');
}

// Handle game state updates from the server
socket.on('state_update', (state) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw paddles
    ctx.fillStyle = 'white';
    ctx.fillRect(0, state.paddles.player1.y, 10, state.paddles.player1.height);
    ctx.fillRect(canvas.width - 10, state.paddles.player2.y, 10, state.paddles.player2.height);

    // Draw ball
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();
});

// Handle keyboard input for player movement
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') socket.emit('player_move', { playerId: 'player2', direction: 'up' });
    if (e.key === 'ArrowDown') socket.emit('player_move', { playerId: 'player2', direction: 'down' });
    if (e.key === 'w') socket.emit('player_move', { playerId: 'player1', direction: 'up' });
    if (e.key === 's') socket.emit('player_move', { playerId: 'player1', direction: 'down' });
});