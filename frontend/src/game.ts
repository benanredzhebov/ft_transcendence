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

let isHost = false;

// Game State Variables
let gameEnded = false;
let matchStarted = false;
let pressedKeys = new Set<string>();
let inTournament = false;
let currentMatch: [string, string] | null = null;
let aliasMap: Record<string, string> = {};
let assignedPlayerId: 'player1' | 'player2' | null = null;
let movePlayersFrame: number | null = null;
let countDownActive = false;

// Game State Interfaces
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
	gameOver: boolean;
}

// Constants
const SERVER_WIDTH = 900;
const SERVER_HEIGHT = 600;

// DOM Elements
let socket: Socket | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;

// Tournament Functions
function promptAliasRegistration() {
	const alias = prompt("Enter your tournament alias:");
	if (alias) socket?.emit('register_alias', alias);
}

// Remove all overlays
function removeOverlays() {
	document.querySelectorAll('.game-overlay').forEach(el => el.remove());
}

function showTournamentDialog(message: string, options?: { confirmText?: string, timer?: number }) {
	const existing = document.querySelector('.tournament-dialog');
	if (existing) existing.remove();

	const dialog = document.createElement('div');
	dialog.className = 'tournament-dialog';

	dialog.innerHTML = `
	<div class="dialog-content">
		<p>${message}</p>
		${options?.confirmText ? 
		`<button class="confirm-btn">${options.confirmText}</button>` : 
		''}
		${options?.timer ? 
		`<div class="countdown">Starting in ${options.timer}...</div>` : 
		''}
	</div>
	`;

	if (options?.confirmText) {
	dialog.querySelector('button')!.onclick = () => {
		socket?.emit('player_ready'); // Only marks ready, does NOT start countdown
		dialog.remove();
	};
	}

	document.body.appendChild(dialog);
	return dialog;
}

function updateCountdownDisplay(seconds: number) {
	let dialog = document.querySelector('.tournament-dialog');
	if (!dialog) {
	dialog = showTournamentDialog('Match starting soon...', { timer: seconds });
	}
	
	const countdownEl = dialog.querySelector('.countdown');
	if (countdownEl) {
	countdownEl.textContent = `Starting in ${seconds}...`;
	}
	
	if (seconds <= 0) {
	setTimeout(() => dialog?.remove(), 1000);
	}
}

function setupTournamentHandlers() {
	if (!socket) return;

	socket.on('player_list_updated', (players: { socketId: string, alias: string }[]) => {
		aliasMap = {};
		players.forEach(player => {
			aliasMap[player.socketId] = player.alias;
		});
	});

	socket.on('alias_registered', ({ success }) => {
		if (success) {
			inTournament = true;
			showTournamentDialog('Registered! Waiting for tournament to start...');
		} else {
			showTournamentDialog('Alias already taken. Please try another name.', {
				confirmText: 'Try Again'
				}).querySelector('button')!.onclick = () => {
					promptAliasRegistration();
			};
		}
	});

	socket.on('await_player_ready', () => {
		console.log('Received await_player_ready');
		removeOverlays();
		assignedPlayerId = null;
		showTournamentDialog('Match ready!', {
			confirmText: 'I\'m Ready'
		});
	});

	socket.on('tournament_bracket', (data: { rounds: { player1: string | null, player2: string | null }[][] }) => {
		const bracketDiv = document.getElementById('tournament-bracket') || document.createElement('div');
		bracketDiv.id = 'tournament-bracket';
		bracketDiv.innerHTML = '<h2>Tournament Bracket</h2>';

		data.rounds.forEach((round, roundIdx) => {
			const roundDiv = document.createElement('div');
			roundDiv.className = 'bracket-round';
			roundDiv.innerHTML = `<strong>Round ${roundIdx + 1}</strong>`;
			round.forEach(match => {
				const matchDiv = document.createElement('div');
				matchDiv.className = 'bracket-match';
				matchDiv.textContent = `${match.player1 || 'Bye'} vs ${match.player2 || 'Bye'}`;
				roundDiv.appendChild(matchDiv);
			});
			bracketDiv.appendChild(roundDiv);
		});
		document.body.prepend(bracketDiv);
	});


	socket.on('countdown_update', (remaining: number) => {
		updateCountdownDisplay(remaining);
	});

	socket.on('match_announcement', (match: { player1: string, player2: string }) => {
		currentMatch = [match.player1, match.player2];
		showMatchInfo(match.player1, match.player2, 0, 0);
		assignedPlayerId = null; // Set this elsewhere if needed
	});

	socket.on('start_match', () => {
		removeOverlays();
		countDownActive = false; // added to start the match. Allow state updates to be rendered
		matchStarted = true;
		gameEnded = false;
		if (movePlayersFrame === null) movePlayers();
	});

	socket.on('tournament_over', ({ winner }: { winner: any }) => {
		const winnerName = typeof winner === 'object' && winner !== null ? winner.alias : winner;
		const dialog = showTournamentDialog(`Tournament winner: ${winnerName}!`, {
			confirmText: 'Return to Lobby'
		});
		dialog.querySelector('button')!.onclick = () => {
			dialog.remove();
			showTournamentResults(winnerName);
			inTournament = false;
			currentMatch = null;
			assignedPlayerId = null;
		};
	});

	socket.on('tournament_lobby', ({ message, players, }) => {
		isHost = players.length > 0 && aliasMap && Object.values(aliasMap).includes(players[0]) && 
		Object.keys(aliasMap).find(key => aliasMap[key] === players[0]) === socket?.id;
		(players as string[]).forEach(alias => {
			if (!Object.values(aliasMap).includes(alias)) {
				aliasMap['unknown-' + alias] = alias;
			}
		});

		console.log('F_Received tournament_lobby:', players);

		// const isHost = players.length > 0 && aliasMap && Object.values(aliasMap).includes(players[0]) && 
		// 	Object.keys(aliasMap).find(key => aliasMap[key] === players[0]) === socket?.id;

		const dialog = showTournamentDialog(
			`${message}<br>Players: ${players.join(', ')}`,
			isHost ? { confirmText: 'Start Tournament' } : undefined
		);

		// Always remove loading screen when lobby is shown
		document.querySelector('.game-loading')?.remove();

		if (isHost && dialog.querySelector('button')) {
			dialog.querySelector('button')!.onclick = () => {
				socket?.emit('start_tournament');
			};
		}
	});
}

// Game UI Functions
function showMatchInfo(
	player1: string | { alias:string },
	player2: string | { alias:string },
	score1: number,
	score2: number
 ) {
	const p1 = typeof player1 === 'object' && player1 !== null ? player1.alias : player1;
	const p2 = typeof player2 === 'object' && player2 !== null ? player2.alias : player2;
	
	const existing = document.getElementById('match-info-box');
	if (existing) {
		existing.innerHTML = `
			<div><strong>${p1}</strong> vs <strong>${p2}</strong></div>
			<div style="text-align: center; margin-top: 4px; font-size: 20px;">
			${score1} : ${score2}
			</div>
		`;
		return;
	}

	const box = document.createElement('div');
	box.id = 'match-info-box';
	box.className = 'match-info-box';

	box.innerHTML = `
	<div><strong>${p1}</strong> vs <strong>${p2}</strong></div>
	<div style="text-align: center; margin-top: 4px; font-size: 20px;">
		${score1} : ${score2}
	</div>
	`;

	document.body.appendChild(box);
}

function showGameOverScreen(winner: string | { alias: string}) {
	if (!canvas?.parentElement) return;

	gameEnded = true;
	matchStarted = false;

	// Reset movePlayers() to null, when a match ends
	if (movePlayersFrame !== null) {
		cancelAnimationFrame(movePlayersFrame);
		movePlayersFrame = null;
	}

	// Add this to clear match info
	const matchBox = document.getElementById('match-info-box');
	if (matchBox) matchBox.remove();

	const overlay = document.createElement('div');
	overlay.className = 'game-overlay';

	const message = document.createElement('div');
	const winnerName = typeof winner === 'object' && winner !== null ? winner.alias : winner;

	message.className = 'game-message';
	message.textContent = `${winnerName} wins!`;

	const buttons = document.createElement('div');
	buttons.className = 'game-buttons';
	
	if (!inTournament) {
		const startBtn = document.createElement('button');
		startBtn.textContent = "Start Tournament";
		startBtn.onclick = () => promptAliasRegistration();
		buttons.appendChild(startBtn);

		const restartBtn = document.createElement('button');
		restartBtn.textContent = "Restart game";
		restartBtn.onclick = () => {
			if (socket) {
				socket.emit('restart_game');
				gameEnded = false;
				matchStarted = true;
				pressedKeys.clear();
				if (movePlayersFrame !== null) {
					cancelAnimationFrame(movePlayersFrame);
					movePlayersFrame = null;
				}
				movePlayers();
				removeOverlays();
				canvas?.focus();
			}
		};
		buttons.appendChild(restartBtn);
	}

	if (inTournament && isHost) {
		const nextBtn = document.createElement('button');
		nextBtn.textContent = "Next Match";
		nextBtn.onclick = () => {
			socket?.emit('host_start_next_match'); // or a new event like 'next_match'
			removeOverlays();
		};
	buttons.appendChild(nextBtn);
	}

	const dashboardBtn = document.createElement('button');
	dashboardBtn.textContent = 'Back to Dashboard';
	dashboardBtn.onclick = () => {
		window.location.href = '/dashboard';
	};
	buttons.appendChild(dashboardBtn);
	
	overlay.appendChild(message);
	overlay.appendChild(buttons);
	canvas.parentElement.appendChild(overlay);
}

function showTournamentResults(winnerName: string) {
	removeOverlays();

	const overlay = document.createElement('div');
	overlay.className = 'game-overlay';

	const message = document.createElement('div');
	message.className = 'game-message';
	message.innerHTML = `<h2>🏆 Tournament Winner: ${winnerName}</h2>`;

	// Clone the bracket if it exists
	const bracketDiv = document.getElementById('tournament-bracket');
	if (bracketDiv) {
		const bracketClone = bracketDiv.cloneNode(true) as HTMLElement;
		bracketClone.style.marginTop = '20px';
		overlay.appendChild(bracketClone);
	}

	const dashboardBtn = document.createElement('button');
	dashboardBtn.textContent = 'Back to Dashboard';
	dashboardBtn.onclick = () => {
		window.location.href = '/dashboard';
	};

	overlay.appendChild(message);
	overlay.appendChild(dashboardBtn);

	document.body.appendChild(overlay);
}

// Game Rendering Functions
function drawGame(state: GameState) {
	if (!ctx || !canvas || gameEnded) return;

	const scaleX = canvas.width / SERVER_WIDTH;
	const scaleY = canvas.height / SERVER_HEIGHT;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Background
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Paddles
	ctx.fillStyle = 'white';
	ctx.fillRect(
	0, 
	state.paddles.player1.y * scaleY, 
	10 * scaleX, 
	state.paddles.player1.height * scaleY
	);
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

	// Score
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

// Game Control Functions
function movePlayers() {
	console.log('movePlayers running', Array.from(pressedKeys));
	if (!socket || gameEnded || (inTournament && !matchStarted)) return;

	//For tournament mode, check if match has started
	if (inTournament && !matchStarted) return;

	if (inTournament) {
		if (assignedPlayerId === 'player1') {
			// console.log('1assignedPlayerId', assignedPlayerId);
			if (pressedKeys.has('w')) socket.emit('player_move', { playerId: 'player1', direction: 'up' });
			if (pressedKeys.has('s')) socket.emit('player_move', { playerId: 'player1', direction: 'down' });
		} else if (assignedPlayerId === 'player2') {
			// console.log('2assignedPlayerId', assignedPlayerId);
			if (pressedKeys.has('arrowup')) socket.emit('player_move', { playerId: 'player2', direction: 'up' });
			if (pressedKeys.has('arrowdown')) socket.emit('player_move', { playerId: 'player2', direction: 'down' });
		}
		} else {
			// Local match controls
			if (pressedKeys.has('w')) socket.emit('player_move', { playerId: 'player1', direction: 'up' });
			if (pressedKeys.has('s')) socket.emit('player_move', { playerId: 'player1', direction: 'down' });
			if (pressedKeys.has('arrowup')) socket.emit('player_move', { playerId: 'player2', direction: 'up' });
			if (pressedKeys.has('arrowdown')) socket.emit('player_move', { playerId: 'player2', direction: 'down' });
			}
			movePlayersFrame = requestAnimationFrame(movePlayers);
		}

function handleKeyDown(e: KeyboardEvent) {
	if (gameEnded) return;
	pressedKeys.add(e.key.toLowerCase());
	console.log('keydown:', e.key.toLowerCase());
}

function handleKeyUp(e: KeyboardEvent) {
	pressedKeys.delete(e.key.toLowerCase());
	console.log('keyup:', e.key.toLowerCase());
}

// Cleanup Functions
function cleanupGame() {
	if (movePlayersFrame !== null) {
	cancelAnimationFrame(movePlayersFrame);
	movePlayersFrame = null;
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

// Main Game Function
export function renderGame(containerId: string = 'app') {
	const container = document.getElementById(containerId);
	if (!container) return;

	// Cleanup previous game if exists
	cleanupGame();
	container.innerHTML = '';
	gameEnded = false;

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
		if (document.visibilityState === 'visible') onResize();
	});
	window.addEventListener('beforeunload', cleanupGame);

	// Resize observer
	if (canvas.parentElement) {
		resizeObserver = new ResizeObserver(() => handleResize(container));
		resizeObserver.observe(container);
	}

	// Initial resize
	handleResize(container);

	// Detect tournament mode from URL
	const urlParams = new URLSearchParams(window.location.search);
	const tournamentMode = urlParams.get('tournament') === 'true'

	// Socket connection
	socket = io('https://127.0.0.1:3000', {
		transports: ['websocket'],
		secure: true,
		query: {
			local: (!tournamentMode).toString() // "true" for local, "false" for tournament
		}
	});

	// Setup tournament handlers
	setupTournamentHandlers();

	// Socket event handlers
	socket.on('connect', () => {
		console.log('✅ Connected:', socket!.id);
	
		if (!tournamentMode) {
			socket!.emit('restart_game');
			gameEnded = false;
			matchStarted = true;
			if (movePlayersFrame === null) movePlayers();
		} else {
			promptAliasRegistration();
		}
	});

	socket.on('connect_error', (err) => {
		console.error('Connection error:', err.message);
	});

	socket.on('assign_controls', (playerId) => {
		assignedPlayerId = playerId;
		if (movePlayersFrame === null) movePlayers();
	});

	socket.on('disconnect', () => {
		console.warn('🔌 Disconnected');
		assignedPlayerId = null;
	
		if (ctx && canvas) {
			ctx.fillStyle = 'red';
			ctx.font = '20px Arial';
		ctx.textAlign = 'center';
		ctx.fillText('Disconnected', canvas.width / 2, canvas.height / 2);
		}
	});

	socket.on('state_update', (state: GameState & { gameOver: boolean }) => {
		// console.log("received paddle y positions:", state.paddles);
		// console.log('Received state_update:', state.paddles.player1.y, state.paddles.player2.y);
		if (countDownActive) return;
	
		document.querySelector('.game-loading')?.remove();

		if (canvas?.parentElement) handleResize(canvas.parentElement);
		requestAnimationFrame(() => drawGame(state));

		if (inTournament && currentMatch) {
			const [alias1, alias2] = currentMatch;
			showMatchInfo(alias1, alias2, state.score.player1, state.score.player2);
		}

		if (!gameEnded && state.gameOver) {
			if (state.score.player1 === 0 && state.score.player2 === 0) return;

			let winner = 'Unknown';
			if (state.score.player1 >= 5) {
				winner = inTournament && currentMatch ? currentMatch[0] : 'Player 1';
			} else if (state.score.player2 >= 5) {
				winner = inTournament && currentMatch ? currentMatch[1] : 'Player 2';
			}
		showGameOverScreen(winner);
		gameEnded = true;

		if (inTournament && currentMatch) { 
			if (
				(state.score.player1 >= 5 && assignedPlayerId === 'player1') ||
				(state.score.player2 >= 5 && assignedPlayerId === 'player2')
			) {
				socket?.emit('match_ended', { winnerSocketId: socket.id });
			}
		}
		}
	});
}