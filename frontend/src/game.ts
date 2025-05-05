
import './game.css';
import { io, Socket } from 'socket.io-client';

// --- Interfaces (matching backend GameState) ---
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
    paddles: {
        player1: PaddleState;
        player2: PaddleState;
    };
    ball: BallState;
    score: {
        player1: number;
        player2: number;
    };
}

// --- Constants ---
const SERVER_WIDTH = 900;
const SERVER_HEIGHT = 600;

// --- Module-level variables ---
let socket: Socket | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number | null = null;

// --- Drawing Logic ---
function drawGame(state: GameState) {
    if (!canvas || !ctx) {
        console.error('Canvas or context not available for drawing');
        return;
    }

    const { width, height } = canvas; // Use current canvas dimensions

    // Calculate scaling factors
    const scaleX = width / SERVER_WIDTH;
    const scaleY = height / SERVER_HEIGHT;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Create a gradient board based on current height
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e'); // Dark blue at the top
    gradient.addColorStop(1, '#16213e'); // Slightly lighter blue at the bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // --- Add shadows before drawing paddles ---
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Draw paddles (scaled)
    ctx.fillStyle = 'white';
    const paddleWidth = 10 * scaleX; // Scale paddle width too
    const paddle1Height = state.paddles.player1.height * scaleY;
    const paddle2Height = state.paddles.player2.height * scaleY;

    ctx.fillRect(
        0, // Player 1 is at x=0
        state.paddles.player1.y * scaleY,
        paddleWidth,
        paddle1Height
    );
    ctx.fillRect(
        width - paddleWidth, // Player 2 is at the right edge
        state.paddles.player2.y * scaleY,
        paddleWidth,
        paddle2Height
    );

    // --- Reset shadows ---
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw ball (scaled) only if game is not over
    if (state.score.player1 < 5 && state.score.player2 < 5) {
        ctx.fillStyle = 'yellow';
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const ballRadius = state.ball.radius * Math.min(scaleX, scaleY);
        ctx.arc(
            state.ball.x * scaleX,
            state.ball.y * scaleY,
            ballRadius,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
    }

    // Draw Score
    ctx.fillStyle = 'white';
    ctx.font = `${Math.max(24, 40 * Math.min(scaleX, scaleY))}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
        `${state.score.player1} - ${state.score.player2}`,
        width / 2,
        Math.max(40, 60 * scaleY)
    );

    // Check for game end condition
    if (state.score.player1 >= 5 || state.score.player2 >= 5) {
        ctx.fillStyle = 'red';
        ctx.font = `${Math.max(40, 70 * Math.min(scaleX, scaleY))}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('END', width / 2, height / 2);
    }
}

// --- State Update Listener ---
function handleStateUpdate(state: GameState) {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(() => drawGame(state));
}

// --- Resize Canvas ---
function handleResize() {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const { clientWidth: containerWidth, clientHeight: containerHeight } = container;


    const aspectRatio = SERVER_WIDTH / SERVER_HEIGHT;
    let newWidth = containerWidth; // Start by assuming width fits container
    let newHeight = newWidth / aspectRatio;

    // If calculated height is too tall, adjust based on container height instead
    if (newHeight > containerHeight) {
        newHeight = containerHeight;
        newWidth = newHeight * aspectRatio;
    }

    // Ensure the canvas doesn't exceed container dimensions (safety check)
    newWidth = Math.min(newWidth, containerWidth);
    newHeight = Math.min(newHeight, containerHeight);


    canvas.width = newWidth;
    canvas.height = newHeight;

}

// --- Keyboard Input Handler ---
function handleKeyDown(e: KeyboardEvent) {
    if (!socket) return;
    const key = e.key.toLowerCase();
    if (key === 'arrowup') socket.emit('player_move', { playerId: 'player2', direction: 'up' });
    if (key === 'arrowdown') socket.emit('player_move', { playerId: 'player2', direction: 'down' });
    if (key === 'w') socket.emit('player_move', { playerId: 'player1', direction: 'up' });
    if (key === 's') socket.emit('player_move', { playerId: 'player1', direction: 'down' });
}

// --- Cleanup function ---
function cleanupGame() {
    console.log("Cleaning up game resources...");
    if (socket) {
        socket.off('state_update', handleStateUpdate);
        socket.disconnect();
        socket = null;
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeyDown);
    canvas = null;
    ctx = null;
}

// --- Main Render Function ---
export function renderGame() {
    // Ensure cleanup happens if renderGame is called again
    cleanupGame();

    const appElement = document.querySelector<HTMLDivElement>('#app');
    if (!appElement) {
        throw new Error('App root element (#app) not found!');
    }

    // Clear previous content
    appElement.innerHTML = '';

    // --- Create Elements ---
    const container = document.createElement('div');
    container.className = "game-container";

    canvas = document.createElement('canvas');
    canvas.className = "game-canvas";
    // Set initial aspect ratio via style to help layout
    canvas.style.setProperty('--server-width', String(SERVER_WIDTH));
    canvas.style.setProperty('--server-height', String(SERVER_HEIGHT));

    ctx = canvas.getContext('2d');

    if (!ctx) {
        container.innerHTML = '<p>Canvas not supported</p>';
        appElement.appendChild(container);
        return;
    }

    // --- Append Elements ---
    container.appendChild(canvas);
    appElement.appendChild(container);

    // --- Initialize ---
    // Call resize once immediately
    handleResize();
    // Call resize again in the next animation frame to ensure layout is stable
    requestAnimationFrame(handleResize);


    socket = io('https://localhost:3000', {
        transports: ['websocket'],
        secure: true
    });


    socket.on('connect', () => {
        console.log('Connected to game server:', socket?.id);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from game server');
    });

    socket.on('connect_error', (err) => {
        console.error('Connection Error:', err.message);
        // Optionally display an error message on the canvas or page
        if (ctx) {
            ctx.fillStyle = 'red';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Connection Error', canvas!.width / 2, canvas!.height / 2);
        }
    });

    // Listen for state updates
    socket.on('state_update', handleStateUpdate);

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    // Add a listener for hash changes to trigger cleanup
    // Note: This assumes the router in main.ts handles navigation
    // We need a way to know when we navigate *away* from #/game
    const handleHashChangeForCleanup = () => {
        if (window.location.hash !== '#/game') {
            cleanupGame();
            window.removeEventListener('hashchange', handleHashChangeForCleanup); // Remove self
        }
    };
    window.addEventListener('hashchange', handleHashChangeForCleanup);
}