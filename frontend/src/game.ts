import './game.css';
import { getSocket, connectSocket } from './socketManager'; // Added connectSocket
import { Socket } from 'socket.io-client'; // Keep for type annotation
import { navigateTo } from './main'; // For redirecting if no token

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
let gameConnectHandler: (() => void) | null = null; // To manage the on-connect listener

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

function setupGameSocketListeners() {
    if (!socket) {
        console.warn('[Game] Attempted to setup listeners but socket is null.');
        return;
    }

    // Remove existing state_update listener to prevent duplicates
    socket.off('state_update', handleStateUpdate);
    socket.on('state_update', handleStateUpdate);
    console.log('[Game] state_update listener attached to shared socket.');

    // You can add other game-specific listeners here if needed
    // e.g., socket.on('game_over', handleGameOver);
}

// --- Cleanup function ---
function cleanupGame() {
    console.log("Cleaning up game resources (using shared socket)...");
    if (socket) {
        socket.off('state_update', handleStateUpdate);
        if (gameConnectHandler) { // If game is cleaned up before connect event fired
            socket.off('connect', gameConnectHandler);
            gameConnectHandler = null;
        }
        // Remove other game-specific listeners if any were added
        // e.g., socket.off('game_over', handleGameOver);
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeyDown);
    
    // Remove hash change listener if it was added by this module
    // (Assuming the existing hash change listener in renderGame is for this module's cleanup)
    // window.removeEventListener('hashchange', handleHashChangeForCleanup); // You'll need to define handleHashChangeForCleanup if used

    if (canvas) {
        const parent = canvas.parentElement;
        if (parent) {
            parent.innerHTML = ''; // Clear the container
        }
    }
    canvas = null;
    ctx = null;
    socket = null; // Clear module-level reference to the shared socket
    console.log("Game cleanup complete.");
}

// --- Main Render Function ---
export function renderGame(): (() => void) { // Ensure it returns the cleanup function
    // Ensure cleanup happens if renderGame is called again
    cleanupGame();

    const appElement = document.querySelector<HTMLDivElement>('#app');
    if (!appElement) {
        throw new Error('App root element (#app) not found!');
    }
    appElement.innerHTML = ''; // Clear previous content before creating new

    // --- Create Elements ---
    const container = document.createElement('div');
    container.className = "game-container";

    canvas = document.createElement('canvas');
    canvas.className = "game-canvas";
    canvas.style.setProperty('--server-width', String(SERVER_WIDTH));
    canvas.style.setProperty('--server-height', String(SERVER_HEIGHT));

    ctx = canvas.getContext('2d');

    if (!ctx) {
        container.innerHTML = '<p>Canvas not supported</p>';
        appElement.appendChild(container);
        return cleanupGame; // Return cleanup even on error
    }
    container.appendChild(canvas);
    appElement.appendChild(container);

    // --- Initialize Socket Connection (using socketManager) ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('[Game] No auth token found. Redirecting to login.');
        container.innerHTML = '<p>Access denied. Please login. Redirecting...</p>';
        setTimeout(() => navigateTo('/login'), 1500);
        return cleanupGame;
    }

    let globalSocket = getSocket();
    if (!globalSocket || !globalSocket.connected) {
        console.log('[Game] Global socket not connected or null. Attempting to connect via socketManager.');
        globalSocket = connectSocket(token); // connectSocket from manager establishes/returns the global socket
    }
    socket = globalSocket; // Assign to the game's module-level socket variable

    if (!socket) {
        console.error('[Game] Failed to obtain socket instance from socketManager. Cannot start game.');
        container.innerHTML = '<p>Error: Could not connect to game services. Please try refreshing.</p>';
        return cleanupGame;
    }

    // --- Setup Game Logic based on Socket Connection State ---
    if (socket.connected) {
        console.log('[Game] Shared socket already connected. Setting up game listeners. ID:', socket.id);
        setupGameSocketListeners();
    } else {
        console.log('[Game] Shared socket not yet connected. Setting up on-connect listener.');
        if (gameConnectHandler && socket) { // Remove previous if any to avoid multiple executions
            socket.off('connect', gameConnectHandler);
        }
        gameConnectHandler = () => {
            console.log('[Game] Shared socket connected (detected by gameConnectHandler). Setting up game listeners. ID:', socket?.id);
            setupGameSocketListeners();
            // Clean up this one-time connect listener
            if (socket && gameConnectHandler) {
                socket.off('connect', gameConnectHandler);
                gameConnectHandler = null;
            }
        };
        socket.on('connect', gameConnectHandler);
    }
    
    // General disconnect and error logging for game context (optional, socketManager might do enough)
    // socket.on('disconnect', (reason) => console.log('[Game] Shared socket disconnected:', reason));
    // socket.on('connect_error', (err) => console.error('[Game] Shared socket connect_error:', err.message));


    // --- Initialize Game Display and Controls ---
    handleResize(); // Call resize once immediately
    requestAnimationFrame(handleResize); // And again for stability

    // Add event listeners for game controls and window resize
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    // The existing hash change listener for cleanup:
    // Ensure this specific handler is correctly managed if you have multiple hash change listeners.
    const handleHashChangeForGameCleanup = () => {
        if (window.location.pathname !== '/game' && window.location.hash !== '#/game') { // Check path and hash
            console.log('[Game] Navigating away from game, triggering cleanup via hash/path change.');
            cleanupGame();
            window.removeEventListener('popstate', handleHashChangeForGameCleanup); // Use popstate for router
            window.removeEventListener('hashchange', handleHashChangeForGameCleanup); 
        }
    };
    window.addEventListener('popstate', handleHashChangeForGameCleanup); // For path changes via navigateTo
    window.addEventListener('hashchange', handleHashChangeForGameCleanup); // For direct hash changes

    return cleanupGame; // Return the cleanup function
}