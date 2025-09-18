import { io } from 'socket.io-client';

console.log('Testing socket connection to AI mode...');

const socket = io('https://c2r11s10.42wolfsburg.de:8443', {
    query: {
        mode: 'ai',
        local: 'false'
    },
    transports: ['websocket', 'polling']
});

socket.on('connect', () => {
    console.log('✅ Connected to server with ID:', socket.id);
});

socket.on('state_update', (state) => {
    console.log('🎮 Game state received:', {
        paused: state.paused,
        gameOver: state.gameOver,
        ballPos: { x: state.ball?.x, y: state.ball?.y },
        ballVel: { vx: state.ball?.vx, vy: state.ball?.vy },
        player1Y: state.paddles?.player1?.y,
        player2Y: state.paddles?.player2?.y
    });
});

socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

// Test for 10 seconds
setTimeout(() => {
    console.log('Test completed, disconnecting...');
    socket.disconnect();
    process.exit(0);
}, 10000);