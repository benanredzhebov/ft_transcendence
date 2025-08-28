/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/27 18:50:43 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/05/27 18:50:43 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import './game.css';
import { io, Socket } from 'socket.io-client';
import { removeOverlays, showTournamentDialog, showMatchInfo } from './game/uiHelpers'
import { GameState, TournamentResult } from './game/types';
import { TournamentMode } from './gameModes/tournamentMode';

// Game State Variables
let gameState: {
	currentMatch: [string | { alias: string }, string | { alias: string }] | null;
	inTournament: boolean;
	matchStarted: boolean;
	gameEnded: boolean;
	countDownActive: boolean;
	movePlayersFrame: number | null;
	tournamentResults: TournamentResult[];
	assignedPlayerId: 'player1' | 'player2' | null;
} = {
	currentMatch: null,
	inTournament: false,
	matchStarted: false,
	gameEnded: false,
	countDownActive: false,
	movePlayersFrame: null,
	tournamentResults: [],
	assignedPlayerId: null,
};

function setGameState(updates: Partial<typeof gameState>) {
	Object.assign(gameState, updates);
}

let tournamentModeInstance: TournamentMode | null = null;
let pressedKeys = new Set<string>();
let inLocalTournament = false;

// Both Tournament



// Constants
const SERVER_WIDTH = 900;
const SERVER_HEIGHT = 600;

// DOM Elements
let socket: Socket | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;

// Local Tournament Functions
function promptLocalTournamentSetup() {
	const dialog = document.createElement('div');
	dialog.className = 'tournament-dialog';
	
	dialog.innerHTML = `
		<div class="dialog-content">
			<h3>Local Tournament Setup</h3>
			<p>Enter player names (2-8 players):</p>
			<div class="player-inputs">
				<input type="text" placeholder="Player 1" class="player-name-input" />
				<input type="text" placeholder="Player 2" class="player-name-input" />
			</div>
			<div class="buttons">
				<button class="add-player-btn">Add Player</button>
				<button class="start-tournament-btn">Start Tournament</button>
				<button class="cancel-btn">Cancel</button>
			</div>
		</div>
	`;
	
	document.body.appendChild(dialog);
	
	const playerInputsDiv = dialog.querySelector('.player-inputs') as HTMLDivElement;
	const addPlayerBtn = dialog.querySelector('.add-player-btn') as HTMLButtonElement;
	const startTournamentBtn = dialog.querySelector('.start-tournament-btn') as HTMLButtonElement;
	const cancelBtn = dialog.querySelector('.cancel-btn') as HTMLButtonElement;
	
	// Add more player input fields
	addPlayerBtn.onclick = () => {
		const currentInputs = playerInputsDiv.querySelectorAll('.player-name-input');
		if (currentInputs.length < 8) {
			const newInput = document.createElement('input');
			newInput.type = 'text';
			newInput.placeholder = `Player ${currentInputs.length + 1}`;
			newInput.className = 'player-name-input';
			playerInputsDiv.appendChild(newInput);
		}
		
		if (currentInputs.length >= 7) {
			addPlayerBtn.disabled = true;
			addPlayerBtn.textContent = 'Max 8 Players';
		}
	};
	
	// Start Local Tournament
	startTournamentBtn.onclick = () => {
		const inputs = playerInputsDiv.querySelectorAll('.player-name-input') as NodeListOf<HTMLInputElement>;
		const playerNames: string[] = [];
		
		inputs.forEach(input => {
			if (input.value.trim()) {
				playerNames.push(input.value.trim());
			}
		});
		
		if (playerNames.length < 2) {
			alert('Please enter at least 2 player names');
			return;
		}
		
		// Check for duplicate names
		const uniqueNames = new Set(playerNames.map(name => name.toLowerCase()));
		if (uniqueNames.size !== playerNames.length) {
			alert('Player names must be unique');
			return;
		}
		
		dialog.remove();
		initializeLocalTournament(playerNames);
	};
	
	// Cancel
	cancelBtn.onclick = () => {
		dialog.remove();
		window.location.href = '/dashboard';
	};
}

function initializeLocalTournament(playerNames: string[]) {
	if (!socket) return;
	
	showTournamentDialog('Setting up local tournament...');
	
	socket.emit('init_local_tournament', { playerNames });
}

function setupLocalTournamentHandlers() {
	if (!socket) return;
	
	socket.on('local_tournament_initialized', (status) => {
		document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());
		showLocalTournamentBracket(status);
		showLocalTournamentMatchDialog(status);
	});
	
	socket.on('local_tournament_match_started', (matchInfo) => {
		document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());
		removeOverlays();
		
		setGameState ({
			gameEnded: false,
			matchStarted: true,
			currentMatch: [matchInfo.player1, matchInfo.player2]
		});
		
		
		// Show match info
		const { player1, player2 } = matchInfo;
		showMatchInfo(player1.name, player2.name, 0, 0);
		
		// Start the game loop
		if (gameState.movePlayersFrame === null) movePlayers();
		
		// Make sure bracket is visible during match
		const bracketDiv = document.getElementById('local-tournament-bracket');
		if (bracketDiv) {
			bracketDiv.style.display = 'none';
		}
	});
	
	socket.on('local_tournament_status_update', (status) => {
		updateLocalTournamentBracket(status);
		if (!status.isActive && !status.isFinished) {
			showLocalTournamentMatchDialog(status);
		}
	});
	
	socket.on('local_tournament_next_match', ({ status }) => {
		updateLocalTournamentBracket(status);

		// Show bracket first, then match dialog after a delay
		const bracketDiv = document.getElementById('local-tournament-bracket');
		if (bracketDiv) {
			bracketDiv.style.display = 'block';
		}
	
		// Show next match dialog after 2 seconds
		setTimeout(() => {
			showLocalTournamentMatchDialog(status);
		}, 2000);
	});
	
	socket.on('local_tournament_finished', ({ winner, allMatches }) => {
		document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());
		showLocalTournamentResults(winner, allMatches);
	});
	
	socket.on('local_tournament_error', ({ message }) => {
		alert(`Local Tournament Error: ${message}`);
	});
	
	socket.on('local_tournament_reset', () => {
		document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());
		document.getElementById('local-tournament-bracket')?.remove();
		showTournamentDialog('Local tournament has been reset', {
			confirmText: 'Return to Dashboard'
		}).querySelector('button')!.onclick = () => {
			window.location.href = '/dashboard';
		};
	});
}

function showLocalTournamentBracket(status: any) {
	let bracketDiv = document.getElementById('local-tournament-bracket') as HTMLDivElement;
	
	if (!bracketDiv) {
		bracketDiv = document.createElement('div');
		bracketDiv.id = 'local-tournament-bracket';
		bracketDiv.className = 'tournament-bracket';
		bracketDiv.innerHTML = `
			<div class="bracket-header">
				<h3>Local Tournament Bracket</h3>
				<button id="close-local-bracket">×</button>
			</div>
			<div class="bracket-content"></div>
		`;
		document.body.appendChild(bracketDiv);
		
		// Close button handler
		const closeBtn = bracketDiv.querySelector('#close-local-bracket');
		const closeBracket = () => {
			bracketDiv.style.display = 'none';
		};
		
		closeBtn?.addEventListener('click', closeBracket);
		
		// Keyboard handler for Escape key
		const keyHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				closeBracket();
				document.removeEventListener('keydown', keyHandler);
			}
		};
		document.addEventListener('keydown', keyHandler);
		
		// Click outside to close
		const clickOutsideHandler = (e: MouseEvent) => {
			if (e.target === bracketDiv) {
				closeBracket();
				document.removeEventListener('click', clickOutsideHandler);
				document.removeEventListener('keydown', keyHandler);
			}
		};
		document.addEventListener('click', clickOutsideHandler);
	}
	
	updateLocalTournamentBracket(status);
	bracketDiv.style.display = 'block';
}

function updateLocalTournamentBracket(status: any) {
	const bracketDiv = document.getElementById('local-tournament-bracket');
	if (!bracketDiv) return;
	
	const contentDiv = bracketDiv.querySelector('.bracket-content') as HTMLDivElement;
	contentDiv.innerHTML = '';
	
	if (status.bracket && status.bracket.rounds) {
		status.bracket.rounds.forEach((round: any[], roundIdx: number) => {
			const roundDiv = document.createElement('div');
			roundDiv.className = 'tournament-round';
			
			const isCurrentRound = roundIdx === status.currentRound - 1;
			const roundStatus = isCurrentRound ? ' (Current)' : '';
			roundDiv.innerHTML = `<strong>Round ${roundIdx + 1}${roundStatus}</strong>`;
			
			round.forEach((match: any) => {
				const matchDiv = document.createElement('div');
				matchDiv.className = `tournament-match ${match.isCurrentMatch ? 'current-match' : ''} ${match.isCompleted ? 'completed-match' : ''}`;
				
				const p1Name = match.player1 ? match.player1.name : 'BYE';
				const p2Name = match.player2 ? match.player2.name : 'BYE';
				
				let matchText = `${p1Name} vs ${p2Name}`;
				
				if (match.winner) {
					matchText += ` → Winner: ${match.winner.name}`;
				} else if (match.isCurrentMatch) {
					matchText += ' ← Playing Now';
				}
				
				matchDiv.textContent = matchText;
				roundDiv.appendChild(matchDiv);
			});
			
			contentDiv.appendChild(roundDiv);
		});
	}
	
	// Show tournament winner if finished
	if (status.isFinished && status.winner) {
		const championDiv = document.createElement('div');
		championDiv.className = 'tournament-champion';
		championDiv.innerHTML = `<strong>🏆 CHAMPION: ${status.winner}</strong>`;
		contentDiv.appendChild(championDiv);
	}
}

function showLocalTournamentMatchDialog(status: any) {
	if (!status.currentMatch || !status.currentMatch.player1) return;
	
	const { player1, player2 } = status.currentMatch;
	const isBye = !player2;
	
	if (isBye) {
		showTournamentDialog(
			`${player1.name} gets a bye to the next round!`,
			{ confirmText: 'Continue', timer: 3 }
		);
		
		setTimeout(() => {
			if (socket) {
				socket.emit('local_tournament_match_ended', {
					winnerId: player1.id,
					scores: { player1: 0, player2: 0, isBye: true }
				});
			}
		}, 3000);
	} else {
		const dialog = showTournamentDialog(
			`Next Match: <strong>${player1.name}</strong> vs <strong>${player2.name}</strong><br><br>
			Controls:<br>
			${player1.name}: W/S keys<br>
			${player2.name}: Arrow Up/Down keys`,
			{ confirmText: 'Start Match' }
		);
		
		dialog.querySelector('button')!.onclick = () => {
			dialog.remove();
			if (socket) {
				socket.emit('start_local_tournament_match');
			}
		};
	}
}

function showLocalTournamentResults(winner: string, allMatches: string[]) {
	const dialog = document.createElement('div');
	dialog.className = 'tournament-dialog tournament-results';
	
	dialog.innerHTML = `
		<div class="dialog-content">
			<h2>🏆 Local Tournament Complete!</h2>
			<h3>Champion: ${winner}</h3>
			<div class="match-results">
				<h4>Match Results:</h4>
				<ul>
					${allMatches.map(match => `<li>${match}</li>`).join('')}
				</ul>
			</div>
			<div class="buttons">
				<button class="new-tournament-btn">New Tournament</button>
				<button class="dashboard-btn">Back to Dashboard</button>
			</div>
		</div>
	`;
	
	document.body.appendChild(dialog);
	
	const newTournamentBtn = dialog.querySelector('.new-tournament-btn') as HTMLButtonElement;
	const dashboardBtn = dialog.querySelector('.dashboard-btn') as HTMLButtonElement;
	
	newTournamentBtn.onclick = () => {
		dialog.remove();
		
		inLocalTournament = true;
		//Clean up local state
		setGameState({
			
			currentMatch: null,
			gameEnded: false,
			matchStarted: false,
		})
		

		// Remove existing bracket
		const bracketDiv = document.getElementById('local-tournament-bracket');
		if (bracketDiv) bracketDiv.remove;

		promptLocalTournamentSetup();
	};
	
	dashboardBtn.onclick = () => {
		dialog.remove();

		inLocalTournament = false;
		// Clean up local state
		setGameState({
			
			currentMatch: null,
			gameEnded: false,
			matchStarted: false
		});
		

		// Remove existing bracket
		const bracketDiv = document.getElementById('local-tournament-bracket');
		if (bracketDiv) bracketDiv.remove();

		if (socket) {
			socket.emit('reset_local_tournament');
		}

		if (socket) {
			socket.disconnect();
			socket = null;
		}

		window.location.href = '/dashboard';
	};
}

// Game UI Functions
function showGameOverScreen(winner: string | { alias: string}) {
	if (!canvas?.parentElement) return;

	setGameState({
		gameEnded: true,
		matchStarted: false
	});
	

	// Reset movePlayers() to null, when a match ends
	if (gameState.movePlayersFrame !== null) {
		cancelAnimationFrame(gameState.movePlayersFrame);
		gameState.movePlayersFrame = null;
	}

	// Add this to clear match info
	const matchBox = document.getElementById('match-info-box');
	if (matchBox) matchBox.remove();

	if (inLocalTournament) {
		return;
	}

	const overlay = document.createElement('div');
	overlay.className = 'game-overlay';

	const message = document.createElement('div');
	const winnerName = typeof winner === 'object' && winner !== null ? winner.alias : winner;

	message.className = 'game-message';
	message.textContent = `${winnerName} wins!`;

	const buttons = document.createElement('div');
	buttons.className = 'game-buttons';

	if (!gameState.inTournament && !inLocalTournament) {
		const startBtn = document.createElement('button');
		startBtn.textContent = "Start Tournament";
		startBtn.onclick = () => promptAliasRegistration();
		buttons.appendChild(startBtn);

		const restartBtn = document.createElement('button');
		restartBtn.textContent = "Restart game";
		restartBtn.onclick = () => {
			if (socket) {
				socket.emit('restart_game');
				setGameState({
					gameEnded: false,
					matchStarted: true
				});
				
				pressedKeys.clear();
				if (gameState.movePlayersFrame !== null) {
					cancelAnimationFrame(gameState.movePlayersFrame);
					gameState.movePlayersFrame = null;
				}
				movePlayers();
				removeOverlays();
				canvas?.focus();
			}
		};
		buttons.appendChild(restartBtn);

		const dashboardBtn = document.createElement('button');
		dashboardBtn.textContent = 'Back to Dashboard';
		dashboardBtn.onclick = () => {
			if (socket) {
				socket.disconnect();
				socket = null;
			}
			const token = sessionStorage.getItem('authToken');
			if (!token) {
				alert('Your session has expired. Please log in again.');
				window.location.href = '/login';
			} else {
				window.location.href = '/dashboard';
			}
		};
		buttons.appendChild(dashboardBtn);

		overlay.appendChild(message);
		overlay.appendChild(buttons);
	} else if (gameState.inTournament) {
		// Only show Back to Dashboard in remote tournament mode
		const dashboardBtn = document.createElement('button');
		dashboardBtn.textContent = 'Back to Dashboard';
		dashboardBtn.onclick = () => {
			if (socket) {
				socket.disconnect();
				socket = null;
			}
			const token = sessionStorage.getItem('authToken');
			if (!token) {
				alert('Your session has expired. Please log in again.');
				window.location.href = '/login';
			} else {
				window.location.href = '/dashboard';
			}
		};
		buttons.appendChild(dashboardBtn);

		overlay.appendChild(message);
		overlay.appendChild(buttons);
	}
	canvas.parentElement.appendChild(overlay);
}

// Game Rendering Functions
function drawGame(state: GameState) {
	if (!ctx || !canvas || gameState.gameEnded) return;

	const scaleX = canvas.width / SERVER_WIDTH;
	const scaleY = canvas.height / SERVER_HEIGHT;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Background
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Center line (dashed)
	ctx.strokeStyle = 'white';
	ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
	ctx.setLineDash([10 * Math.min(scaleX, scaleY), 5 * Math.min(scaleX, scaleY)]);
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();
	ctx.setLineDash([]); // Reset line dash

	// Paddles with rounded edges
	ctx.fillStyle = 'white';
	const paddleRadius = 5 * Math.min(scaleX, scaleY);
	
	// Player 1 paddle (left side)
	const p1X = 0;
	const p1Y = state.paddles.player1.y * scaleY;
	const p1Width = 10 * scaleX;
	const p1Height = state.paddles.player1.height * scaleY;
	
	ctx.beginPath();
	ctx.roundRect(p1X, p1Y, p1Width, p1Height, paddleRadius);
	ctx.fill();
	
	// Player 2 paddle (right side)
	const p2X = canvas.width - 10 * scaleX;
	const p2Y = state.paddles.player2.y * scaleY;
	const p2Width = 10 * scaleX;
	const p2Height = state.paddles.player2.height * scaleY;
	
	ctx.beginPath();
	ctx.roundRect(p2X, p2Y, p2Width, p2Height, paddleRadius);
	ctx.fill();

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

	// Score - Player 1 (left side)
	ctx.fillStyle = 'green';
	ctx.font = `${40 * Math.min(scaleX, scaleY)}px Arial`;
	ctx.textAlign = 'left';
	ctx.fillText(
	`${state.score.player1}`,
	20 * scaleX,
	50 * scaleY
	);

	// Score - Player 2 (right side)
	ctx.textAlign = 'right';
	ctx.fillText(
	`${state.score.player2}`,
	canvas.width - 20 * scaleX,
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

// Game Control Functions
export function movePlayers() {
	console.log('movePlayers running', Array.from(pressedKeys));
	if (!socket || gameState.gameEnded || (gameState.inTournament && !gameState.matchStarted)) return;

	//For tournament mode, check if match has started
	if (gameState.inTournament && !gameState.matchStarted) return;

	if (gameState.inTournament) {
		if (gameState.assignedPlayerId === 'player1') {
			// console.log('1assignedPlayerId', assignedPlayerId);
			if (pressedKeys.has('w')) socket.emit('player_move', { playerId: 'player1', direction: 'up' });
			if (pressedKeys.has('s')) socket.emit('player_move', { playerId: 'player1', direction: 'down' });
		} else if (gameState.assignedPlayerId === 'player2') {
			// console.log('2assignedPlayerId', assignedPlayerId);
			if (pressedKeys.has('arrowup')) socket.emit('player_move', { playerId: 'player2', direction: 'up' });
			if (pressedKeys.has('arrowdown')) socket.emit('player_move', { playerId: 'player2', direction: 'down' });
		}
	} else if (inLocalTournament) {
		// Local tournament controls
		if (pressedKeys.has('w')) socket.emit('local_tournament_player_move', { playerId: 'player1', direction: 'up' });
		if (pressedKeys.has('s')) socket.emit('local_tournament_player_move', { playerId: 'player1', direction: 'down' });
		if (pressedKeys.has('arrowup')) socket.emit('local_tournament_player_move', { playerId: 'player2', direction: 'up' });
		if (pressedKeys.has('arrowdown')) socket.emit('local_tournament_player_move', { playerId: 'player2', direction: 'down' });
	} else {
		// Local match controls
		if (pressedKeys.has('w')) socket.emit('player_move', { playerId: 'player1', direction: 'up' });
		if (pressedKeys.has('s')) socket.emit('player_move', { playerId: 'player1', direction: 'down' });
		if (pressedKeys.has('arrowup')) socket.emit('player_move', { playerId: 'player2', direction: 'up' });
		if (pressedKeys.has('arrowdown')) socket.emit('player_move', { playerId: 'player2', direction: 'down' });
	}
			setGameState( {movePlayersFrame: requestAnimationFrame(movePlayers)});
		}

function handleKeyDown(e: KeyboardEvent) {
	if (gameState.gameEnded) return;
	pressedKeys.add(e.key.toLowerCase());
	console.log('keydown:', e.key.toLowerCase());
}

function handleKeyUp(e: KeyboardEvent) {
	pressedKeys.delete(e.key.toLowerCase());
	console.log('keyup:', e.key.toLowerCase());
}

// Cleanup Functions
function cleanupGame() {
	if (gameState.movePlayersFrame !== null) {
	cancelAnimationFrame(gameState.movePlayersFrame);
	setGameState({ movePlayersFrame: null });
	}

	if (socket) {
	socket.disconnect();
	socket = null;
	}

	window.removeEventListener('keydown', handleKeyDown);
	window.removeEventListener('keyup', handleKeyUp);
	window.removeEventListener('resize', onResize);
	window.removeEventListener('orientationchange', onResize);
	window.removeEventListener('focus', onResize);
	document.removeEventListener('visibilitychange', onResize);
	
	resizeObserver?.disconnect();
	resizeObserver = null;
	
	pressedKeys.clear();

	const matchBox = document.getElementById('match-info-box');
	if (matchBox) matchBox.remove();
}

function onResize() {
	if (canvas?.parentElement) {
	handleResize(canvas.parentElement);
	}
}

function	promptAliasRegistration() {
		if (!socket) {
			console.error('Socket not initialized');
			return;
		}
		const alias = prompt("Enter your tournament alias:");
		if (alias) {
			const token = sessionStorage.getItem('authToken');
			socket.emit('register_alias', { alias, token });
		}
		else {
			window.location.href = '/dashboard';
		}
	}


// Main Game Function
export function renderGame(containerId: string = 'app') {
	const container = document.getElementById(containerId);
	if (!container) return;

	// Cleanup previous game if exists
	cleanupGame();
	container.innerHTML = '';
	gameState.gameEnded = false;

	// Loading screen
	const loading = document.createElement('div');
	loading.className = 'game-loading';
	loading.innerHTML = `
	<div>Loading game...</div>
	<div class="spinner"></div>`;

	container.appendChild(loading);

	// Game container setup
	container.className = 'game-container';

	// Canvas setup
	canvas = document.createElement('canvas');
	canvas.className = 'game-canvas';
	ctx = canvas.getContext('2d');
	container.appendChild(canvas);

	// Event listeners
	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);
	window.addEventListener('resize', onResize);
	window.addEventListener('orientationchange', onResize);
	window.addEventListener('focus', onResize);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			onResize();
			// Prompt for alias if in tournament mode and not registered
			if (
				socket &&
				!tournamentModeInstance?.aliasRegistered &&
				window.location.search.includes('tournament=true')
			) {
				promptAliasRegistration();
			}
		}
	});
	window.addEventListener('beforeunload', cleanupGame);

	window.addEventListener('beforeunload', () => {
		if (tournamentModeInstance?.aliasRegistered && socket && socket.connected) {
			socket.emit('leave_tournament');
		}
	});
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState ==='hidden' && tournamentModeInstance?.aliasRegistered && socket && socket.connected) {
			socket.emit('player_inactive');
		}
	});

	// Resize observer
	if (canvas.parentElement) {
		resizeObserver = new ResizeObserver(() => handleResize(container));
		resizeObserver.observe(container);
	}

	// Initial resize
	handleResize(container);

	// Detect tournament mode from URL
	const urlParams = new URLSearchParams(window.location.search);
	const isTournamentMode = urlParams.get('tournament') === 'true';
	const localTournamentMode = urlParams.get('tournament') === 'local';

	if (urlParams.get('tournament') === 'true') {
		// Clear any existing reset dialogs immediately
		document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());

		// Reset tournament state
		if (tournamentModeInstance)
			tournamentModeInstance.aliasRegistered = false;
		gameState.inTournament = false;

		// DON'T call promptAliasRegistration() here - let the connect handler do it
	}
	const aiMode = urlParams.get('mode') === 'ai';

	// Socket connection to connect with Remote players
	const backendUrl = `https://${window.location.hostname}:3000`;
	socket = io(backendUrl, {
		// transports: ['websocket'],
		// secure: true,
		query: {
			token: localStorage.getItem('jwtToken'),
			local: (!isTournamentMode && !aiMode && !localTournamentMode).toString(), // "true" for local, "false" for tournament or AI
			mode: aiMode ? 'ai' : (isTournamentMode ? 'tournament' : (localTournamentMode ? 'local_tournament' : 'local'))
		}
	});

	tournamentModeInstance = new TournamentMode({
		socket,
		gameState,
		setGameState,
		promptAliasRegistration,
	});

	// Setup tournament handlers

	setupLocalTournamentHandlers();

	// Socket event handlers
	socket.on('connect', () => {
		console.log('✅ Connected:', socket!.id);

		gameState.gameEnded = true;
		gameState.matchStarted = false;
		inLocalTournament = false;
		gameState.currentMatch = null;

		// Cancel any running game loop
		if (gameState.movePlayersFrame !== null) {
			cancelAnimationFrame(gameState.movePlayersFrame);
			setGameState({movePlayersFrame: null});
		}

		// Clear any existing overlays and dialogs
		removeOverlays();
		document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());
		document.querySelectorAll('.alias-dialog').forEach(el => el.remove());
		
		const bracketDiv = document.getElementById('local-tournament-bracket');
		if (bracketDiv) bracketDiv.remove();
	
		// Reset canvas if it exists
		if (canvas && ctx) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	
		console.log('Game state reset after reconnection');
		
		// Check if this is a reconnection after server restart
		const wasInTournamentReconnect = sessionStorage.getItem('tournament_reconnect') === 'true';
		const wasAliasRegistered = sessionStorage.getItem('tournament_alias_registered') === 'true';
		
		if (!isTournamentMode && !localTournamentMode) {
			socket!.emit('restart_game');
			gameState.gameEnded = false;
			gameState.matchStarted = true;
			if (gameState.movePlayersFrame === null) movePlayers();
		} else if (localTournamentMode) {
			// Local Tournament mode
			inLocalTournament = true;
			promptLocalTournamentSetup();
		} else {
			// Remote Tournament mode
			if (wasInTournamentReconnect) {
				// We were previously in a tournament before server restart
				console.log('Detected tournament reconnection after server restart');
				if (tournamentModeInstance)
					tournamentModeInstance.aliasRegistered = wasAliasRegistered;
			}
			
			if (!tournamentModeInstance?.aliasRegistered) {
				promptAliasRegistration();
			}
		}
		
		// Clear reconnection flags after handling
		sessionStorage.removeItem('tournament_reconnect');
		sessionStorage.removeItem('tournament_alias_registered');
	});

	socket.on('connect_error', (err) => {
		console.error('Connection error:', err.message);
	});

	socket.on('assign_controls', (playerId) => {
		setGameState({ assignedPlayerId: playerId });
		if (gameState.movePlayersFrame === null) movePlayers();
	});

	socket.on('disconnect', (reason) => {
		console.log('Disconnected:', reason);
		removeOverlays();
		document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());
		document.getElementById('tournament-bracket')?.remove();
		document.querySelectorAll('.game-loading').forEach(el => el.remove());

		if (canvas?.parentElement) {
			const overlay = document.createElement('div');
			overlay.className = 'game-overlay disconnect-overlay';
			overlay.style.position = 'absolute';
			overlay.style.top = '0';
			overlay.style.left = '0';
			overlay.style.width = '100%';
			overlay.style.height = '100%';
			overlay.style.display = 'flex';
			overlay.style.justifyContent = 'center';
			overlay.style.alignItems = 'center';
			overlay.style.background = 'rgba(0,0,0,0.8)';
			overlay.style.zIndex = '1000';
			
			// Show different messages based on reason
			let message = 'Disconnected from server';
			if (reason === 'io server disconnect') {
				message = 'Server disconnected the connection';
			} else if (reason === 'transport close') {
				message = 'Connection lost to server';
			}
			
			overlay.innerHTML = `
				<div style="color: white; font-size: 2rem; text-align: center;">
					${message}<br>
					<div id="reconnect-status" style="font-size: 1rem; margin: 1rem 0;">
						${socket?.connected ? 'Connected' : 'Attempting to reconnect...'}
					</div>
					<button id="manual-reconnect-btn" style="margin-top: 1rem; padding: 0.5rem 1rem; font-size: 1rem;">Manual Reconnect</button>
				</div>`;
			canvas.parentElement.appendChild(overlay);

			document.getElementById('manual-reconnect-btn')?.addEventListener('click', () => {
				// Store tournament state before reload if in tournament
				if (gameState.inTournament) {
					sessionStorage.setItem('tournament_reconnect', 'true');
					sessionStorage.setItem('tournament_alias_registered', (tournamentModeInstance?.aliasRegistered ?? false).toString());
				}
				window.location.reload();
			});
		}
	});

	socket.on('reconnect_attempt', (attemptNumber) => {
		console.log(`Reconnection attempt ${attemptNumber}`);
		const statusDiv = document.getElementById('reconnect-status');
		if (statusDiv) {
			statusDiv.textContent = `Reconnection attempt ${attemptNumber}/5...`;
		}
	});

	socket.on('reconnect', (attemptNumber) => {
		console.log(`Reconnected after ${attemptNumber} attempts`);
		const overlay = document.querySelector('.disconnect-overlay');
		if (overlay) {
			overlay.remove();
		}
		
		// Restore tournament state if needed
		if (gameState.inTournament && !tournamentModeInstance?.aliasRegistered) {
			promptAliasRegistration();
		}
	});

	socket.on('reconnect_failed', () => {
		console.log('Failed to reconnect');
		const statusDiv = document.getElementById('reconnect-status');
		if (statusDiv) {
			statusDiv.textContent = 'Failed to reconnect. Please try manual reconnect.';
			statusDiv.style.color = 'red';
		}
	});

	socket.on('state_update', (state: GameState & { gameOver: boolean }) => {
		// console.log("received paddle y positions:", state.paddles);
		// console.log('Received state_update:', state.paddles.player1.y, state.paddles.player2.y);
		if (gameState.countDownActive) return;
	
		document.querySelector('.game-loading')?.remove();

		if (canvas?.parentElement) handleResize(canvas.parentElement);
		requestAnimationFrame(() => drawGame(state));

		if (gameState.inTournament && gameState.currentMatch) {
			const [alias1, alias2] = gameState.currentMatch;
			showMatchInfo(alias1, alias2, state.score.player1, state.score.player2);
		}

		if (!gameState.gameEnded && state.gameOver) {
			if (state.score.player1 === 0 && state.score.player2 === 0) return;

			let winner: string | { alias: string } = 'Unknown';
			let winnerId: string = '';
			
			if (state.score.player1 >= 5) {
				winner = gameState.inTournament && gameState.currentMatch ? gameState.currentMatch[0] : 'Player 1';
				if (
					inLocalTournament &&
					gameState.currentMatch &&
					typeof gameState.currentMatch[0] === 'object' &&
					gameState.currentMatch[0] !== null &&
					'id' in gameState.currentMatch[0] &&
					typeof gameState.currentMatch[0].id === 'string'
				) {
					winnerId = gameState.currentMatch[0].id;
				} else {
					winnerId = '';
				}
			} else if (state.score.player2 >= 5) {
				winner = gameState.inTournament && gameState.currentMatch ? gameState.currentMatch[1] : 'Player 2';
				if (
					inLocalTournament &&
					gameState.currentMatch &&
					typeof gameState.currentMatch[1] === 'object' &&
					gameState.currentMatch[1] !== null &&
					'id' in gameState.currentMatch[1] &&
					typeof gameState.currentMatch[1].id === 'string'
				) {
					winnerId = gameState.currentMatch[1].id;
				} else {
					winnerId = '';
				}
			}

			// Save tournament results
			if (gameState.inTournament && gameState.currentMatch) {
				gameState.tournamentResults.push({
					player1: typeof gameState.currentMatch[0] === 'object' && gameState.currentMatch[0] !== null ? gameState.currentMatch[0].alias : gameState.currentMatch[0],
					player2: typeof gameState.currentMatch[1] === 'object' && gameState.currentMatch[1] !== null ? gameState.currentMatch[1].alias : gameState.currentMatch[1],
					score1: state.score.player1,
					score2: state.score.player2
				});
			}

			showGameOverScreen(winner);
			gameState.gameEnded = true;

			if (inLocalTournament) {
					removeOverlays();

					// Show the tournament bracket immediately
					const bracketDiv = document.getElementById('local-tournament-bracket');
					if (bracketDiv)
							bracketDiv.style.display = 'block';

					// Emit the match result to update tournament state
					socket?.emit('local_tournament_match_ended', {
						winnerId: winnerId,
						scores: { player1: state.score.player1, player2: state.score.player2 }
					});
			} else if (gameState.inTournament && gameState.currentMatch) { 
				if (
					(state.score.player1 >= 5 && gameState.assignedPlayerId === 'player1') ||
					(state.score.player2 >= 5 && gameState.assignedPlayerId === 'player2')
				) {
					socket?.emit('match_ended', { winnerSocketId: socket.id });
				}
			}
		}
	});
}