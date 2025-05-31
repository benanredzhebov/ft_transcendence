import './game.css';
import { getSocket, connectSocket } from './socketManager';
import { Socket } from 'socket.io-client';
import { navigateTo } from './main';


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
    gameOver: boolean; 
}

const SERVER_WIDTH = 900;
const SERVER_HEIGHT = 600;

let socket: Socket | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number | null = null;
let gameConnectHandler: (() => void) | null = null; 
let matchId: string | null = null;

let player1SocketId: string | null = null;
let player2SocketId: string | null = null;
let currentPlayerRole: 'player1' | 'player2' | null = null;

// --- Game Over UI Elements ---
let gameOverControlsContainer: HTMLDivElement | null = null;
let newMatchButton: HTMLButtonElement | null = null;
let dashboardButton: HTMLButtonElement | null = null;

// --- Drawing Logic ---
function drawGame(state: GameState) {
    if (!canvas || !ctx) {
        console.error('Canvas or context not available for drawing');
        return;
    }

    const { width, height } = canvas;

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
    if (state.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'red';
        ctx.font = `${Math.max(35, 60 * Math.min(scaleX, scaleY))}px "Press Start 2P", cursive`; // Retro font
        ctx.textAlign = 'center';
        ctx.fillText('END', width / 2, height / 2 - Math.max(20, 40 * scaleY));
    }
}

// --- State Update Listener ---
function handleStateUpdate(state: GameState) {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(() => drawGame(state));

    // Show/Hide game over buttons
    if (state.gameOver && gameOverControlsContainer) {
        gameOverControlsContainer.style.display = 'flex';
    } else if (gameOverControlsContainer) {
        // Hide if game somehow resets or is not over
        gameOverControlsContainer.style.display = 'none';
    }
}

// --- Resize Canvas ---
function handleResize() {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const { clientWidth: containerWidth, clientHeight: containerHeight } = container;


    const aspectRatio = SERVER_WIDTH / SERVER_HEIGHT;
    let newWidth = containerWidth;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > containerHeight) {
        newHeight = containerHeight;
        newWidth = newHeight * aspectRatio;
    }

    newWidth = Math.min(newWidth, containerWidth);
    newHeight = Math.min(newHeight, containerHeight);

    canvas.width = newWidth;
    canvas.height = newHeight;

}

// --- Keyboard Input Handler ---
function handleKeyDown(e: KeyboardEvent) {
    if (!socket || !currentPlayerRole) {
        // console.log("KeyDown ignored: No socket or no player role determined.");
        return;
    }
    const key = e.key.toLowerCase();

    if (['arrowup', 'arrowdown', 'w', 's'].includes(key)) {
        e.preventDefault();
    }

    if (currentPlayerRole === 'player1') {
        if (key === 'w') {
            socket.emit('player_move', { playerId: 'player1', direction: 'up' });
        } else if (key === 's') {
            socket.emit('player_move', { playerId: 'player1', direction: 'down' });
        }
    } else if (currentPlayerRole === 'player2') {
        if (key === 'arrowup') {
            socket.emit('player_move', { playerId: 'player2', direction: 'up' });
        } else if (key === 'arrowdown') {
            socket.emit('player_move', { playerId: 'player2', direction: 'down' });
        }
    }
}

function setupGameSocketListeners() {
    if (!socket) {
        console.warn('[Game] Attempted to setup listeners but socket is null.');
        return;
    }

    socket.off('state_update', handleStateUpdate);
    socket.on('state_update', handleStateUpdate);
    console.log('[Game] state_update listener attached to shared socket.');

    socket.off('rematch_started'); 
    socket.on('rematch_started', (data: { newMatchId: string, player1SocketId: string, player2SocketId: string, initialState: GameState }) => {
        console.log('[Game] Rematch started:', data);
        
        matchId = data.newMatchId;
        player1SocketId = data.player1SocketId; 
        player2SocketId = data.player2SocketId;

        initializeGameDisplayAndControls();
        setupPlayerRole();
        handleStateUpdate(data.initialState);
    });

    socket.off('rematch_error');
    socket.on('rematch_error', (data: { message: string }) => {
        // console.error('[Game] Rematch error:', data.message);
        alert(`Rematch Error: ${data.message}`);
        if (newMatchButton) {
            newMatchButton.disabled = false;
            newMatchButton.textContent = 'New Match';
        }
        if (dashboardButton) {
            dashboardButton.disabled = false;
        }
        if (gameOverControlsContainer) {
            gameOverControlsContainer.style.display = 'flex'; 
        }
    });
}

// --- Cleanup function ---
function cleanupGame() {
    console.log("Cleaning up game resources (using shared socket)...");
    if (socket) {
        socket.off('state_update', handleStateUpdate);
        if (gameConnectHandler) { 
            socket.off('connect', gameConnectHandler);
            gameConnectHandler = null;
        }
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeyDown);
    
    currentPlayerRole = null;
    player1SocketId = null;
    player2SocketId = null;
    matchId = null;

    if (canvas) {
        const parent = canvas.parentElement;
        if (parent && parent.id === 'game-container') {
            parent.innerHTML = ''; // Clear the game container
        }
        canvas = null;
    }
    ctx = null;
    
    if (gameOverControlsContainer) {
        gameOverControlsContainer = null;
    }
    newMatchButton = null;
    dashboardButton = null;

    console.log("Game cleanup complete.");
}

// --- Main Render Function ---
export function renderGame(): (() => void) {
    const app = document.getElementById('app');
    if (!app) {
        console.error('App element not found');
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }
    app.innerHTML = `
        <div id="game-container" class="game-container">
            <canvas id="pong-canvas" class="game-canvas"></canvas>
            <div id="game-over-controls" style="display: none;"></div>
        </div>
    `;

    const container = document.getElementById('game-container') as HTMLDivElement;
    canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
    gameOverControlsContainer = document.getElementById('game-over-controls') as HTMLDivElement;

    if (!container || !canvas || !gameOverControlsContainer) {
        console.error('Failed to get game elements from DOM');
        return () => { /* basic cleanup */ };
    }

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get 2D rendering context');
        return () => { /* basic cleanup */ };
    }

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    matchId = urlParams.get('matchId');
    player1SocketId = urlParams.get('p1');
    player2SocketId = urlParams.get('p2');

    if (!matchId || !player1SocketId || !player2SocketId) {
        console.error('[Game] Missing matchId, p1, or p2 in URL. Cannot determine player role.');
        container.innerHTML = '<p>Error: Game information missing. <a href="/dashboard">Back to Dashboard</a></p>';
        return () => { /* basic cleanup */ };
    }

    // --- Initialize Socket Connection (using socketManager) ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('[Game] No auth token found. Redirecting to login.');
        navigateTo('/login');
        return () => { /* basic cleanup */ };
    }

    socket = getSocket(); 
    if (!socket) { // If socket isn't already in dashboard
        console.log('[Game] Socket not found, attempting to connect via socketManager.');
        connectSocket(token);
        socket = getSocket();
    }
    
    if (!socket) {
        console.error("[Game] Failed to get or initialize socket instance. Game cannot proceed.");
        container.innerHTML = '<p>Error: Could not connect to game server. <a href="/dashboard">Back to Dashboard</a></p>';
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }

    const setupPlayerRole = () => {
        if (socket && socket.id && player1SocketId && player2SocketId) {
            if (socket.id === player1SocketId) {
                currentPlayerRole = 'player1';
            } else if (socket.id === player2SocketId) {
                currentPlayerRole = 'player2';
            } else {
                // This client is neither player1 nor player2 (e.g., spectator, or error in IDs)
                console.warn(`[Game] Client socket ID ${socket.id} does not match P1 (${player1SocketId}) or P2 (${player2SocketId}). No controls will be active.`);
                currentPlayerRole = null; 
            }
            console.log(`[Game] Client role: ${currentPlayerRole}. Socket ID: ${socket.id}. P1: ${player1SocketId}, P2: ${player2SocketId}`);
        } else {
            console.warn('[Game] Cannot determine player role: socket, socket.id, player1SocketId, or player2SocketId is missing/invalid.', {
                socketExists: !!socket,
                socketId: socket?.id,
                p1Id: player1SocketId,
                p2Id: player2SocketId
            });
            currentPlayerRole = null;
        }
    };

    // --- Setup Game Logic based on Socket Connection State ---
    const setupGameForMatch = () => {
        console.log('[Game] Socket connected/available. Setting up game. Socket ID:', socket?.id);
        
        setupPlayerRole(); // Determine role now that socket.id should be available

        if (matchId) {
            console.log(`[Game] Joining specific match: ${matchId}`);
            socket?.emit('join_specific_game', { gameId: matchId }); 
        } else {
            console.warn('[Game] No matchId found (should have been caught earlier). Game might not start correctly.');
        }
        setupGameSocketListeners(); 
    };

    if (socket.connected) {
        console.log('[Game] Socket already connected. Proceeding with game setup.');
        setupGameForMatch();
    } else {
        console.log('[Game] Socket not yet connected. Setting up on-connect listener.');
        if (gameConnectHandler && socket) { // Clean up previous listener if any
            socket.off('connect', gameConnectHandler);
        }
        gameConnectHandler = () => {
            console.log('[Game] Socket connected (via gameConnectHandler). Proceeding with game setup.');
            setupGameForMatch();
            if (socket && gameConnectHandler) { // Clean up this one-time listener
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
    gameOverControlsContainer.innerHTML = ''; // Clear previous buttons if any
    gameOverControlsContainer.className = 'game-over-controls';

    newMatchButton = document.createElement('button');
    newMatchButton.className = 'game-over-button';
    newMatchButton.textContent = 'New Match';
    newMatchButton.onclick = () => {
        if (socket && matchId && newMatchButton && dashboardButton) {
            socket.emit('request_rematch', { oldMatchId: matchId });
            newMatchButton.disabled = true;
            newMatchButton.textContent = 'Requesting...';
            dashboardButton.disabled = true;
        }
    };

    dashboardButton = document.createElement('button');
    dashboardButton.className = 'game-over-button';
    dashboardButton.textContent = 'Back to Dashboard';
    dashboardButton.onclick = () => {
        navigateTo('/dashboard');
    };

    gameOverControlsContainer.appendChild(newMatchButton);
    gameOverControlsContainer.appendChild(dashboardButton);

    initializeGameDisplayAndControls(); 

    // Add event listeners for game controls and window resize
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    handleResize();
    requestAnimationFrame(handleResize);

    const handleHashChangeForGameCleanup = () => {
        if (window.location.pathname !== '/game' && window.location.hash !== '#/game') {
            console.log('[Game] Navigating away from game, triggering cleanup via hash/path change.');
            cleanupGame();
            window.removeEventListener('popstate', handleHashChangeForGameCleanup);
            window.removeEventListener('hashchange', handleHashChangeForGameCleanup); 
        }
    };
    window.addEventListener('popstate', handleHashChangeForGameCleanup);
    window.addEventListener('hashchange', handleHashChangeForGameCleanup);

    return cleanupGame;

}

function initializeGameDisplayAndControls() {
    if (gameOverControlsContainer) {
        gameOverControlsContainer.style.display = 'none';
    }
    if (newMatchButton) {
        newMatchButton.disabled = false;
        newMatchButton.textContent = 'New Match';
    }
    if (dashboardButton) {
        dashboardButton.disabled = false;
    }
}

function setupPlayerRole() {
    throw new Error('Function not implemented.');
}
