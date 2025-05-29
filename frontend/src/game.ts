import './game.css';
import { Socket } from 'socket.io-client';
import { getSocket } from './socketManager';
import { navigateTo } from './main';

// --- Interfaces ---
interface PaddleState {
    y: number;
    height: number;
    width: number; // Make sure backend sends this if it's variable
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
    gameId?: string;
    status?: 'waiting' | 'countdown' | 'playing' | 'ended';
}

// --- Constants ---
const SERVER_WIDTH = 900;
const SERVER_HEIGHT = 600;
const MAX_SCORE = 5;

// --- Module-level variables ---
let gameSocketInstance: Socket | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number | null = null;
let localPlayerRole: 'player1' | 'player2' | null = null;
let opponentUsername: string | null = null;
let currentGameId: string | null = null;

let hasLocalPlayerClickedStart = false;
let isGameActive = false;

let gamePageContainer: HTMLDivElement | null = null; // To hold all game page content

// --- Drawing Logic ---
function drawGame(state: GameState) {
    if (!canvas || !ctx) return;

    const { width, height } = canvas;
    const scaleX = width / SERVER_WIDTH;
    const scaleY = height / SERVER_HEIGHT;

    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw paddles (ensure width is part of PaddleState or use a default)
    const paddleWidthP1 = (state.paddles.player1.width || 10) * scaleX;
    const paddleHeightP1 = state.paddles.player1.height * scaleY;
    const paddleWidthP2 = (state.paddles.player2.width || 10) * scaleX;
    const paddleHeightP2 = state.paddles.player2.height * scaleY;

    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillRect(0, state.paddles.player1.y * scaleY, paddleWidthP1, paddleHeightP1);
    ctx.fillRect(width - paddleWidthP2, state.paddles.player2.y * scaleY, paddleWidthP2, paddleHeightP2);
    ctx.shadowColor = 'transparent'; // Reset shadow

    // Draw ball (even if static in pre-game)
    if (state.ball && state.ball.radius > 0) {
        ctx.fillStyle = 'yellow';
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const ballRadius = state.ball.radius * Math.min(scaleX, scaleY);
        ctx.arc(state.ball.x * scaleX, state.ball.y * scaleY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // Draw Score
    ctx.fillStyle = 'white';
    ctx.font = `${Math.max(24, 40 * Math.min(scaleX, scaleY))}px 'Press Start 2P', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${state.score.player1} - ${state.score.player2}`, width / 2, Math.max(40, 60 * scaleY));

    // Game Over Message (on canvas)
    if (state.score.player1 >= MAX_SCORE || state.score.player2 >= MAX_SCORE) {
        isGameActive = false; // Stop game interaction
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, height / 2 - 60 * scaleY, width, 120 * scaleY);
        ctx.fillStyle = 'red';
        ctx.font = `${Math.max(30, 60 * Math.min(scaleX, scaleY))}px 'Press Start 2P', Arial, sans-serif`;
        let winnerMessage = "Game Over!";
        if (state.score.player1 >= MAX_SCORE) {
            winnerMessage = localPlayerRole === 'player1' ? "You Win!" : `${opponentUsername || 'Player 1'} Wins!`;
        } else if (state.score.player2 >= MAX_SCORE) {
            winnerMessage = localPlayerRole === 'player2' ? "You Win!" : `${opponentUsername || 'Player 2'} Wins!`;
        }
        ctx.fillText(winnerMessage, width / 2, height / 2 - 10 * scaleY);
        ctx.fillStyle = 'white';
        ctx.font = `${Math.max(16, 24 * Math.min(scaleX, scaleY))}px 'Press Start 2P', Arial, sans-serif`;
        ctx.fillText("Click to return to Dashboard", width / 2, height / 2 + 30 * scaleY);
        if (canvas) {
            canvas.onclick = () => { navigateTo('/dashboard'); if (canvas) canvas.onclick = null; };
        }
    }
}

// --- State Update Listener ---
function handleStateUpdate(state: GameState) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    // Only draw if game is active OR if we are in the "waiting for opponent" phase (canvas is visible)
    if (isGameActive || (hasLocalPlayerClickedStart && !isGameActive)) {
        animationFrameId = requestAnimationFrame(() => drawGame(state));
    }
}

// --- Resize Canvas ---
function handleResize() {
    if (!canvas) return; // Canvas might not exist yet
    const container = canvas.parentElement;
    if (!container) return;
    const { clientWidth: cW, clientHeight: cH } = container;
    const aspectRatio = SERVER_WIDTH / SERVER_HEIGHT;
    let nW = cW;
    let nH = nW / aspectRatio;
    if (nH > cH) { nH = cH; nW = nH * aspectRatio; }
    canvas.width = Math.min(nW, cW);
    canvas.height = Math.min(nH, cH);
    // Re-draw with current state if game is active or waiting (canvas visible)
    if ((isGameActive || (hasLocalPlayerClickedStart && !isGameActive)) && gameSocketInstance) {
        // This might need a stored last state to redraw accurately, or rely on next state_update
        // For simplicity, let's assume a state_update will follow or initial draw was sufficient.
        // Or, if you have a 'lastKnownState' variable:
        // if (lastKnownState) drawGame(lastKnownState);
    }
}

// --- Keyboard Input Handler ---
function handleKeyDown(e: KeyboardEvent) {
    if (!gameSocketInstance || !isGameActive || !localPlayerRole || !currentGameId) return;
    const key = e.key.toLowerCase();
    if ((localPlayerRole === 'player1' && key === 'w') || (localPlayerRole === 'player2' && key === 'arrowup')) {
        gameSocketInstance.emit('player_move', { gameId: currentGameId, playerId: localPlayerRole, direction: 'up' });
    } else if ((localPlayerRole === 'player1' && key === 's') || (localPlayerRole === 'player2' && key === 'arrowdown')) {
        gameSocketInstance.emit('player_move', { gameId: currentGameId, playerId: localPlayerRole, direction: 'down' });
    }
}

// --- Game-specific socket event handlers ---
const onGameSocketConnect = () => {
    console.log('Game view: Shared socket connected:', gameSocketInstance?.id);
    if (currentGameId && !isGameActive && hasLocalPlayerClickedStart) {
        gameSocketInstance?.emit('player_ready_to_start', { gameId: currentGameId, playerRole: localPlayerRole });
    }
};
const onGameSocketDisconnect = (reason: Socket.DisconnectReason) => {
    console.log('Game view: Shared socket disconnected:', reason);
    isGameActive = false;
    if (gamePageContainer) { // Show disconnect message in the main page container
        gamePageContainer.innerHTML = `<p style="color:orange; text-align:center;">Disconnected: ${reason}. Attempting to reconnect...</p>`;
    }
};
const onGameSocketConnectError = (err: Error) => {
    console.error('Game view: Shared socket connection error:', err.message);
    isGameActive = false;
    if (gamePageContainer) {
        gamePageContainer.innerHTML = `<p style="color:red; text-align:center;">Connection Error: ${err.message}</p>`;
    }
};

const onGameCanStartModified = (data: { gameId: string, initialState?: GameState }) => {
    if (data.gameId === currentGameId) {
        console.log('Server says game can start for game ID:', data.gameId);
        isGameActive = true;
        hasLocalPlayerClickedStart = true; // Should already be true
        renderGame(); // Re-render to show the active game phase

        if (data.initialState && canvas && ctx) { // Ensure canvas is ready
            drawGame(data.initialState); // Draw the very first active state
        }
    }
};

function attachCoreGameSocketListeners() {
    if (!gameSocketInstance) return;
    gameSocketInstance.off('state_update').on('state_update', handleStateUpdate);
    gameSocketInstance.off('game_can_start').on('game_can_start', onGameCanStartModified);
    gameSocketInstance.off('connect').on('connect', onGameSocketConnect);
    gameSocketInstance.off('disconnect').on('disconnect', onGameSocketDisconnect);
    gameSocketInstance.off('connect_error').on('connect_error', onGameSocketConnectError);
    gameSocketInstance.off('opponent_disconnected_from_game').on('opponent_disconnected_from_game', ({ gameId, message }) => {
        if (gameId === currentGameId) {
            isGameActive = false;
            if (gamePageContainer) {
                gamePageContainer.innerHTML = `
                    <div style="text-align:center; color:white; padding-top: 50px;">
                        <p>${message || 'Opponent disconnected. Game Over.'}</p>
                        <button id="returnToDashboardBtnGame" class="game-html-start-button">Return to Dashboard</button>
                    </div>`;
                document.getElementById('returnToDashboardBtnGame')?.addEventListener('click', () => navigateTo('/dashboard'));
            }
        }
    });
}

// --- Canvas Initialization ---
function initializeCanvas(container: HTMLElement) {
    canvas = document.createElement('canvas');
    canvas.className = "game-canvas";
    canvas.style.setProperty('--server-width', String(SERVER_WIDTH));
    canvas.style.setProperty('--server-height', String(SERVER_HEIGHT));
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');
    if (!ctx) {
        container.innerHTML = '<p>Canvas not supported</p>';
        return false;
    }
    handleResize();
    requestAnimationFrame(handleResize);
    return true;
}

// --- Cleanup function ---
function cleanupGame() {
    console.log("Cleaning up game resources...");
    if (gameSocketInstance) {
        gameSocketInstance.off('state_update');
        gameSocketInstance.off('connect');
        gameSocketInstance.off('disconnect');
        gameSocketInstance.off('connect_error');
        gameSocketInstance.off('game_can_start');
        gameSocketInstance.off('opponent_disconnected_from_game');
    }
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('hashchange', handleHashChangeForCleanup);

    if (gamePageContainer) gamePageContainer.remove();
    gamePageContainer = null;
    
    canvas = null; ctx = null; animationFrameId = null;
    localPlayerRole = null; opponentUsername = null; currentGameId = null;
    // Reset these flags so returning to /game shows the start button
    hasLocalPlayerClickedStart = false;
    isGameActive = false;
}

// --- Main Render Function ---
export function renderGame() {
    // Ensure previous game instance is fully cleaned up
    // This is important if renderGame can be called multiple times (e.g., by router or state changes)
    if (gamePageContainer) cleanupGame();


    const appElement = document.querySelector<HTMLDivElement>('#app');
    if (!appElement) { console.error('App root element (#app) not found!'); return; }
    
    // Create the main container for this page if it doesn't exist
    // This check is to handle recursive calls to renderGame for state transitions
    if (!document.querySelector('.game-page-container')) {
        gamePageContainer = document.createElement('div');
        gamePageContainer.className = 'game-page-container';
        appElement.appendChild(gamePageContainer);
    } else {
        gamePageContainer = document.querySelector('.game-page-container') as HTMLDivElement;
        gamePageContainer.innerHTML = ''; // Clear previous content for re-render
    }


    const gameInfoString = sessionStorage.getItem('currentGameInfo');
    if (!gameInfoString) {
        gamePageContainer.innerHTML = '<p style="color:white; text-align:center; margin-top: 50px;">Error: Game information not found. <a href="/dashboard" style="color: #3498db;">Go to Dashboard</a></p>';
        return;
    }
    try {
        const gameInfo = JSON.parse(gameInfoString);
        localPlayerRole = gameInfo.role;
        opponentUsername = gameInfo.opponentUsername;
        currentGameId = gameInfo.gameId;
    } catch (e) {
        gamePageContainer.innerHTML = '<p style="color:white; text-align:center; margin-top: 50px;">Error: Invalid game information. <a href="/dashboard" style="color: #3498db;">Go to Dashboard</a></p>';
        return;
    }

    gameSocketInstance = getSocket();
    if (!gameSocketInstance) {
        console.error("Game: Socket not available.");
        gamePageContainer.innerHTML = '<p style="color:white; text-align:center;">Error: Cannot connect to game server. <a href="/dashboard">Go to Dashboard</a></p>';
        return;
    }
    attachCoreGameSocketListeners();

    if (!hasLocalPlayerClickedStart) {
        gamePageContainer.style.display = 'flex';
        gamePageContainer.style.flexDirection = 'column';
        gamePageContainer.style.justifyContent = 'center';
        gamePageContainer.style.alignItems = 'center';
        gamePageContainer.style.height = '100vh';

        const startButton = document.createElement('button');
        startButton.textContent = 'Start Online Match';
        startButton.className = 'game-html-start-button'; // Add CSS for this class
        startButton.onclick = () => {
            if (currentGameId && localPlayerRole && gameSocketInstance?.connected) {
                gameSocketInstance.emit('player_ready_to_start', { gameId: currentGameId, playerRole: localPlayerRole });
                hasLocalPlayerClickedStart = true;
                renderGame(); // Re-render to show waiting state
            } else {
                console.error("Cannot start game: missing info or socket not connected.");
                // You might want to show an error to the user here
            }
        };
        gamePageContainer.appendChild(startButton);
    } else if (hasLocalPlayerClickedStart && !isGameActive) {
        gamePageContainer.style.display = 'flex'; // Or 'block' or remove if not needed
        gamePageContainer.style.flexDirection = 'column';
        gamePageContainer.style.justifyContent = 'center';
        gamePageContainer.style.alignItems = 'center';
        gamePageContainer.style.height = 'auto'; // Adjust as needed, or remove for default flow

        const waitingText = document.createElement('p');
        waitingText.textContent = 'Waiting for opponent...';
        waitingText.className = 'game-waiting-text-html'; // Add CSS for this
        waitingText.style.color = 'white'; // Basic styling
        waitingText.style.textAlign = 'center';
        waitingText.style.marginBottom = '20px';
        gamePageContainer.appendChild(waitingText);

        if (initializeCanvas(gamePageContainer)) {
            const initialPreGameState: GameState = {
                paddles: {
                    player1: { y: SERVER_HEIGHT / 2 - 50, height: 100, width: 10 },
                    player2: { y: SERVER_HEIGHT / 2 - 50, height: 100, width: 10 },
                },
                ball: { x: SERVER_WIDTH / 2, y: SERVER_HEIGHT / 2, radius: 10 },
                score: { player1: 0, player2: 0 },
                status: 'waiting'
            };
            drawGame(initialPreGameState);
        }
    } else { // isGameActive is true
        gamePageContainer.style.display = 'flex'; // Or 'block'
        gamePageContainer.style.flexDirection = 'column';
        gamePageContainer.style.justifyContent = 'center';
        gamePageContainer.style.alignItems = 'center';
        gamePageContainer.style.height = 'auto'; // Adjust as needed

        if (initializeCanvas(gamePageContainer)) {
            // Active game is drawn via state_update.
            // If onGameCanStart provided an initial state, it would have been drawn.
            // If re-rendering while active, draw a default or last known state.
            const defaultActiveState: GameState = { // A sensible default if no immediate state update
                paddles: {
                    player1: { y: SERVER_HEIGHT / 2 - 50, height: 100, width: 10 },
                    player2: { y: SERVER_HEIGHT / 2 - 50, height: 100, width: 10 },
                },
                ball: { x: SERVER_WIDTH / 2, y: SERVER_HEIGHT / 2, radius: 10 },
                score: { player1: 0, player2: 0 }, // Or fetch last known score
                status: 'playing'
            };
            drawGame(defaultActiveState);
        }
    }

    // Add global listeners if they aren't already managed to prevent duplicates
    // The current cleanupGame/renderGame structure should handle this.
    window.removeEventListener('resize', handleResize); // Remove first to avoid duplicates
    window.addEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);
    window.removeEventListener('hashchange', handleHashChangeForCleanup);
    window.addEventListener('hashchange', handleHashChangeForCleanup);
}

const handleHashChangeForCleanup = () => {
    if (window.location.hash !== '#/game' && !window.location.pathname.startsWith('/game')) {
        cleanupGame();
    }
};

// Add some basic CSS for the new elements (you'd typically put this in a .css file)
const styleElement = document.createElement('style');
styleElement.textContent = `
  .game-page-container {
    width: 100%;
    min-height: 100vh; /* Ensure it takes full viewport height for centering */
    /* display: flex; // These are set dynamically in renderGame now
    flex-direction: column;
    justify-content: center;
    align-items: center; */
  }
  .game-html-start-button {
    padding: 15px 30px;
    font-size: 1.2em;
    color: white;
    background-color: #007bff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: 20px; /* If canvas is shown below */
  }
  .game-html-start-button:hover {
    background-color: #0056b3;
  }
  .game-waiting-text-html {
    color: white;
    font-size: 1.5em;
    text-align: center;
    margin-bottom: 20px;
  }
`;
document.head.appendChild(styleElement);