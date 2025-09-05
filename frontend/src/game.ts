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
import { PauseManager } from './pauseManager';

let isHost = false;

// Game State Variables
let gameEnded = false;
let matchStarted = false;
let pressedKeys = new Set<string>();
let inTournament = false;
let inLocalTournament = false;
let aiMode = false;
// let currentMatch: [string, string] | null = null;
let currentMatch: [string | { alias: string }, string | { alias: string }] | null = null;
let aliasMap: Record<string, string> = {};
let assignedPlayerId: 'player1' | 'player2' | null = null;
let movePlayersFrame: number | null = null;
let countDownActive = false;
let aliasRegistered = false;
let tournamentResults: { player1: string, player2: string, score1: number, score2: number}[] = [];

// Pause Manager
let pauseManager: PauseManager;

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
	if (alias) {
		const token = sessionStorage.getItem('authToken'); // ***new: to store Match data***
		socket?.emit('register_alias', { alias, token });
	}
}

// Remove all overlays
function removeOverlays() {
	document.querySelectorAll('.game-overlay').forEach(el => el.remove());
	// Also hide tournament bracket if it exists
	const bracketDiv = document.getElementById('tournament-bracket');
	if (bracketDiv) bracketDiv.style.display = 'none';
}

function showTournamentDialog(message: string, 
	options?: { confirmText?: string, timer?: number, onConfirm?: () => void }
) {
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
			if (options.confirmText === "I'm Ready") {
				socket?.emit('player_ready'); // Only marks ready, does NOT start countdown
			}
			if (options.onConfirm) options.onConfirm();
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

	socket.on('alias_registered', ({ success, message }) => {
		if (success) {
			aliasRegistered = true;
			inTournament = true;
			showTournamentDialog('Registered! Waiting for tournament to start...');
		} else {
			const errorMessage = message || 'Alias already taken. Please try another name.';
			if (message === 'You are already registered in this tournament.') {
				const dialog = showTournamentDialog(errorMessage, {
					confirmText: 'Back to Dashboard'
				});
				dialog.querySelector('button')!.onclick = () => {
					// Redirect to dashboard
					window.location.href = '/dashboard';
				};
			} else {
				showTournamentDialog(errorMessage, {
					confirmText: 'Try Again'
				}).querySelector('button')!.onclick = () => {
					promptAliasRegistration();
				};
			}
		}
	});

	socket.on('tournament_error', (data: { message: string }) => {
		showTournamentDialog(`Error: ${data.message}`, {
			confirmText: 'Back to Dashboard',
			onConfirm: () => {
				// Check authentication before redirecting
				const token = sessionStorage.getItem('authToken');
				if (!token) {
					alert('Your session has expired. Please log in again.');
					window.location.href = '/login';
				} else {
					window.location.href = '/dashboard';
				}
			}
		});
	});

	socket.on('await_player_ready', () => {
		console.log('Received await_player_ready');
		removeOverlays();
		
		// Show tournament bracket before each match
		const bracketDiv = document.getElementById('tournament-bracket');
		if (bracketDiv) bracketDiv.style.display = 'block';
		
		assignedPlayerId = null;
		showTournamentDialog('Match ready!', {
			confirmText: 'I\'m Ready'
		});
	});

	socket.on('tournament_bracket', (data: { 
		rounds: { 
			player1: string | null, 
			player2: string | null,
			winner: string | null,
			scores: { player1: number, player2: number } | null,
			isComplete: boolean,
			isCurrent: boolean,
			isBye: boolean
		}[][], 
		currentRound: number,
		isFinished: boolean,
		tournamentWinner: string | null 
	}) => {
		(window as any)['lastBracketData'] = data;
		const bracketDiv = document.getElementById('tournament-bracket') || document.createElement('div');
		bracketDiv.id = 'tournament-bracket';
		bracketDiv.innerHTML = `
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
				<h2 style="margin: 0;">Tournament Overview ${data.isFinished ? '- COMPLETE!' : ''}</h2>
				<button id="close-bracket" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 14px;">×</button>
			</div>
		`;

		data.rounds.forEach((round, roundIdx) => {
			const roundDiv = document.createElement('div');
			roundDiv.className = 'bracket-round';
			
			// Round header with status
			const isCurrentRound = roundIdx === data.currentRound;
			const roundStatus = isCurrentRound ? ' (Current)' : '';
			roundDiv.innerHTML = `<strong>Round ${roundIdx + 1}${roundStatus}</strong>`;
			
			round.forEach(match => {
				const matchDiv = document.createElement('div');
				matchDiv.className = 'bracket-match';
				
				// Add status classes for styling
				if (match.isComplete) {
					matchDiv.classList.add('completed-match');
				} else if (match.isCurrent) {
					matchDiv.classList.add('current-match');
				} else if (match.isBye) {
					matchDiv.classList.add('bye-match');
				}

				// Build match display text
				let matchText = '';
				if (match.isBye) {
					const nonNullPlayer = match.player1 || match.player2;
					matchText = `${nonNullPlayer} (Bye)`;
				} else {
					matchText = `${match.player1 || 'TBD'} vs ${match.player2 || 'TBD'}`;
				}
				
				// Add scores if match is complete
				if (match.isComplete && match.scores) {
					matchText += ` (${match.scores.player1} - ${match.scores.player2})`;
				}
				
				// Add winner indicator
				if (match.winner) {
					matchText += ` → Winner: ${match.winner}`;
				} else if (match.isCurrent) {
					matchText += ' ← Playing Now';
				}
				
				matchDiv.textContent = matchText;
				roundDiv.appendChild(matchDiv);
			});
			bracketDiv.appendChild(roundDiv);
		});
		
		// Add tournament winner display if finished
		if (data.isFinished && data.tournamentWinner) {
			const championDiv = document.createElement('div');
			championDiv.className = 'tournament-champion';
			championDiv.innerHTML = `<strong>🏆 CHAMPION: ${data.tournamentWinner}</strong>`;
			bracketDiv.appendChild(championDiv);
		}
		
		// Add close button functionality
		const closeBtn = bracketDiv.querySelector('#close-bracket');
		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				bracketDiv.style.display = 'none';
			});
		}
		
		document.body.appendChild(bracketDiv);
	});


	socket.on('countdown_update', (remaining: number) => {
		updateCountdownDisplay(remaining);
	});

	socket.on('countdown_cancelled', () => {
		// Remove countdown dialog if it exists
		const dialog = document.querySelector('.tournament-dialog');
		if (dialog) dialog.remove();
		countDownActive = false;
	});

	socket.on('match_announcement', (match: { player1: string, player2: string }) => {
		currentMatch = [match.player1, match.player2];
		showMatchInfo(match.player1, match.player2, 0, 0);
		assignedPlayerId = null; // Set this elsewhere if needed
	});

	socket.on('start_match', () => {
		removeOverlays();
		// Hide tournament bracket during gameplay
		const bracketDiv = document.getElementById('tournament-bracket');
		if (bracketDiv) bracketDiv.style.display = 'none';
		
		countDownActive = false; // added to start the match. Allow state updates to be rendered
		matchStarted = true;
		gameEnded = false;
		pauseManager.updateState({ matchStarted: true, gameEnded: false, inTournament: true });
		pauseManager.createPauseButton(); // Create pause button when match starts
		if (movePlayersFrame === null) movePlayers();
	});

	socket.on('tournament_over', ({ winner, allMatches }: { winner: any, allMatches: string[] }) => {
		console.log('🏆 Tournament Over event received:', { winner, allMatches }); // Debug log
		const winnerName = typeof winner === 'object' && winner !== null ? winner.alias : winner;
		
		// Instead of showing the simple overlay, enhance the existing tournament bracket
		const bracketDiv = document.getElementById('tournament-bracket');
		if (bracketDiv) {
			// Make sure the bracket is visible
			bracketDiv.style.display = 'block';
			
			// Add a "Return to Lobby" button to the tournament bracket
			let lobbyBtn = bracketDiv.querySelector('#return-to-lobby') as HTMLButtonElement;
			if (!lobbyBtn) {
				lobbyBtn = document.createElement('button');
				lobbyBtn.id = 'return-to-lobby';
				lobbyBtn.textContent = 'Return to Lobby';
				lobbyBtn.style.cssText = `
					background: #4CAF50; 
					color: white; 
					border: none; 
					padding: 10px 20px; 
					border-radius: 4px; 
					cursor: pointer; 
					font-size: 16px; 
					margin-top: 15px; 
					display: block; 
					margin-left: auto; 
					margin-right: auto;
				`;
				lobbyBtn.onclick = () => {
					// Remove tournament bracket and reset state
					bracketDiv.remove();
					inTournament = false;
					currentMatch = null;
					assignedPlayerId = null;
					
					// Show the simple results overlay for final summary
					showTournamentResults(winnerName, allMatches);
				};
				bracketDiv.appendChild(lobbyBtn);
			}
		} else {
			// Fallback: if no bracket exists, show the simple dialog
			const dialog = showTournamentDialog(`Tournament winner: ${winnerName}!`, {
				confirmText: 'Return to Lobby'
			});
			dialog.querySelector('button')!.onclick = () => {
				dialog.remove();
				showTournamentResults(winnerName, allMatches);
				inTournament = false;
				currentMatch = null;
				assignedPlayerId = null;
			};
		}
	});

	socket.on('match_forfeit', ({ winner, loser, reason }: { winner: string, loser: string, reason: string }) => {
		removeOverlays();
		const dialog = showTournamentDialog(
			`Match Forfeit!<br><strong>${winner}</strong> wins by forfeit<br>${loser} ${reason}<br><br>Tournament will continue automatically...`
			// No confirmText provided = no button shown
		);
		
		// Automatically remove the dialog after 3 seconds to match server delay
		setTimeout(() => {
			if (dialog.parentNode) {
				dialog.remove();
			}
			inTournament = true;
			// Show tournament bracket again
			const bracketDiv = document.getElementById('tournament-bracket');
			if (bracketDiv) bracketDiv.style.display = 'block';
		}, 3000);
	});

	socket.on('match_cancelled', ({ reason }: { reason?: string }) => {
		removeOverlays();
		const message = reason ? `Match cancelled: ${reason}` : 'Match cancelled due to player disconnection';
		const dialog = showTournamentDialog(message, { confirmText: 'OK' });
		dialog.querySelector('button')!.onclick = () => {
			dialog.remove();
			// Show tournament bracket again
			const bracketDiv = document.getElementById('tournament-bracket');
			if (bracketDiv) bracketDiv.style.display = 'block';
		};
	});

	socket.on('tournament_cancelled', ({ reason }: { reason?: string }) => {
		removeOverlays();
		document.getElementById('tournament-bracket')?.remove();
		
		let message = reason ? `Tournament cancelled: ${reason}` : 'Tournament cancelled';
		
		// Special handling for server restart scenarios
		if (reason && (reason.includes('server') || reason.includes('restart') || reason.includes('reset'))) {
			message = `Tournament cancelled due to server restart.<br>All tournament states have been reset.<br>You can start a new tournament.`;
		}
		
		const dialog = showTournamentDialog(message, { confirmText: 'Return to Dashboard' });
		dialog.querySelector('button')!.onclick = () => {
			dialog.remove();
			inTournament = false;
			currentMatch = null;
			assignedPlayerId = null;
			aliasRegistered = false; // Reset alias registration
			
			// Clear any stored tournament state
			sessionStorage.removeItem('tournament_reconnect');
			sessionStorage.removeItem('tournament_alias_registered');
			
			// Check authentication before redirecting
			const token = sessionStorage.getItem('authToken');
			if (!token) {
				// No valid session, redirect to login with message
				alert('Your session has expired. Please log in again.');
				window.location.href = '/login';
			} else {
				// Valid session, redirect to dashboard (use correct SPA route)
				window.location.href = '/dashboard';
			}
		};
	});

	// Add handler for server-initiated tournament reset during active match
	socket.on('tournament_reset', ({ reason }: { reason?: string }) => {
		removeOverlays();
		document.getElementById('tournament-bracket')?.remove();
		
		const message = reason ? 
			`Tournament has been reset: ${reason}<br><br>All players and matches have been cleared.<br>You can start a new tournament.` :
			'Tournament has been reset by the server.<br><br>All players and matches have been cleared.<br>You can start a new tournament.';
		
		const dialog = showTournamentDialog(message, { confirmText: 'Return to Dashboard' });
		dialog.querySelector('button')!.onclick = () => {
			dialog.remove();
			inTournament = false;
			currentMatch = null;
			assignedPlayerId = null;
			aliasRegistered = false; // Reset alias registration
			
			// Clear any stored tournament state
			sessionStorage.removeItem('tournament_reconnect');
			sessionStorage.removeItem('tournament_alias_registered');
			
			// Redirect to dashboard
			const token = sessionStorage.getItem('authToken');
			if (!token) {
				alert('Your session has expired. Please log in again.');
				window.location.href = '/login';
			} else {
				window.location.href = '/dashboard';
			}
		};
	});

	socket.on('tournament_lobby_closed', () => {
		console.log('Tournament lobby closed - no players remaining');

		// Reset tournament UI state
		const registerContainer = document.getElementById('register-container');
		const tournamentLobby = document.getElementById('tournament-lobby');
		const tournamentBracket = document.getElementById('tournament-bracket');

		if (registerContainer) registerContainer.style.display = 'block';
		if (tournamentLobby) tournamentLobby.style.display = 'none';
		if (tournamentBracket) tournamentBracket.style.display = 'none';

		aliasRegistered = false;
		inTournament = false;

		// Show a message that tournament was closed
		showTournamentDialog('Tournament closed - no players remaining', {
			confirmText: 'OK',
			onConfirm: () => {
				// Optionally redirect to dashboard
				window.location.href = '/dashboard';
			}
		});
	});

	socket.on('tournament_lobby', ({ message, players, }) => {
		tournamentResults = [];
		isHost = players.length > 0 && aliasMap && Object.values(aliasMap).includes(players[0]) && 
		Object.keys(aliasMap).find(key => aliasMap[key] === players[0]) === socket?.id;
		(players as string[]).forEach(alias => {
			if (!Object.values(aliasMap).includes(alias)) {
				aliasMap['unknown-' + alias] = alias;
			}
		});

		// Debug
		// console.log('F_Received tournament_lobby:', players);

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
	
	// Start tournament
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
		
		gameEnded = false;
		matchStarted = true;
		pauseManager.updateState({ matchStarted: true, gameEnded: false, inLocalTournament: true });
		pauseManager.createPauseButton(); // Create pause button when local tournament match starts

		currentMatch = [matchInfo.player1, matchInfo.player2];
		
		// Show match info
		const { player1, player2 } = matchInfo;
		showMatchInfo(player1.name, player2.name, 0, 0);
		
		// Start the game loop
		if (movePlayersFrame === null) movePlayers();
		
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

	// Local tournament pause/resume handlers
	socket.on('local_tournament_paused', () => {
		pauseManager.updateState({ gamePaused: true });
	});

	socket.on('local_tournament_resumed', () => {
		pauseManager.updateState({ gamePaused: false });
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
			${player2.name}: Arrow Up/Down keys<br><br>
			<em>Press P or Space to pause during the match</em>`,
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
		
		//Clean up local state
		inLocalTournament = true;
		currentMatch = null;
		gameEnded = false;
		matchStarted = false;

		// Remove existing bracket
		const bracketDiv = document.getElementById('local-tournament-bracket');
		if (bracketDiv) bracketDiv.remove;

		promptLocalTournamentSetup();
	};
	
	dashboardBtn.onclick = () => {
		dialog.remove();

		// Clean up local state
		inLocalTournament = false;
		currentMatch = null;
		gameEnded = false;
		matchStarted = false;

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
	<div style="text-align: center; margin-top: 8px; font-size: 12px; color: #ccc;">
		Press P or Space to pause
	</div>
	`;

	document.body.appendChild(box);
}

function showGameOverScreen(winner: string | { alias: string}) {
	if (!canvas?.parentElement) return;

	gameEnded = true;
	matchStarted = false;
	pauseManager.updateState({ gameEnded: true, matchStarted: false });
	pauseManager.cleanup(); // Clean up pause UI when game ends

	// Reset movePlayers() to null, when a match ends
	if (movePlayersFrame !== null) {
		cancelAnimationFrame(movePlayersFrame);
		movePlayersFrame = null;
	}

	// Add this to clear match info
	const matchBox = document.getElementById('match-info-box');
	if (matchBox) matchBox.remove();

	if (inLocalTournament || inTournament) {
		// For tournament mode, show the bracket immediately while waiting for server updates
		if (inTournament) {
			const bracketDiv = document.getElementById('tournament-bracket');
			if (bracketDiv) {
				bracketDiv.style.display = 'block';
			}
		}
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

	if (!inTournament && !inLocalTournament) {
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
				pauseManager.updateState({ gameEnded: false, matchStarted: true });
				pauseManager.createPauseButton(); // Create pause button when restarting
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
		
		canvas.parentElement.appendChild(overlay);
	}
}

function showTournamentResults(winnerName: string, allMatches?: string[]) {
	removeOverlays();

	// Debug: log the results before rendering
	// console.log('Tournament Results:', tournamentResults);

	const overlay = document.createElement('div');
	overlay.className = 'game-overlay';

	const message = document.createElement('div');
	message.className = 'game-message';
	message.innerHTML = `<h2>🏆 Tournament Champion: ${winnerName}</h2>`;

	// Show all match results if provided
	if (allMatches && allMatches.length > 0) {
		const matchResultsDiv = document.createElement('div');
		matchResultsDiv.id = 'all-match-results';
		matchResultsDiv.innerHTML = '<h3>Complete Tournament Results</h3>';
		
		const resultsList = document.createElement('div');
		resultsList.className = 'match-results-list';
		
		allMatches.forEach(matchResult => {
			const matchDiv = document.createElement('div');
			matchDiv.className = 'match-result-item';
			matchDiv.textContent = matchResult;
			resultsList.appendChild(matchDiv);
		});
		
		matchResultsDiv.appendChild(resultsList);
		overlay.appendChild(matchResultsDiv);
	}

	const dashboardBtn = document.createElement('button');
	dashboardBtn.textContent = 'Back to Dashboard';
	dashboardBtn.onclick = () => {
		// Disconnect socket and reload to ensure clean state on dashboard
		if (socket) {
			socket.disconnect();
			socket = null;
		}
		
		// Check authentication before redirecting
		const token = sessionStorage.getItem('authToken');
		if (!token) {
			alert('Your session has expired. Please log in again.');
			window.location.href = '/login';
		} else {
			window.location.href = '/dashboard';
		}
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
function movePlayers() {
	// console.log('movePlayers running', Array.from(pressedKeys));
	
	// Debug tournament mode pause manager state
	if (inTournament) {
		console.log('🎮 Tournament movePlayers debug:', {
			gameEnded,
			pauseManagerState: pauseManager.getState(),
			matchStarted,
			assignedPlayerId,
			pressedKeysSize: pressedKeys.size,
			canProcessMovement: socket && !gameEnded && !pauseManager.getState().gamePaused && (!inTournament || matchStarted)
		});
	}
	
	// Only process movement if game is active and not paused
	if (socket && !gameEnded && !pauseManager.getState().gamePaused && (!inTournament || matchStarted)) {
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
		} else if (inLocalTournament) {
			// Local tournament controls
			if (pressedKeys.has('w')) socket.emit('local_tournament_player_move', { playerId: 'player1', direction: 'up' });
			if (pressedKeys.has('s')) socket.emit('local_tournament_player_move', { playerId: 'player1', direction: 'down' });
			if (pressedKeys.has('arrowup')) socket.emit('local_tournament_player_move', { playerId: 'player2', direction: 'up' });
			if (pressedKeys.has('arrowdown')) socket.emit('local_tournament_player_move', { playerId: 'player2', direction: 'down' });
		} else if (aiMode) {
			// AI mode - only player1 (left paddle) can be controlled by human
			if (pressedKeys.has('w')) socket.emit('player_move', { playerId: 'player1', direction: 'up' });
			if (pressedKeys.has('s')) socket.emit('player_move', { playerId: 'player1', direction: 'down' });
		} else {
			// Local match controls - both players
			if (pressedKeys.has('w')) socket.emit('player_move', { playerId: 'player1', direction: 'up' });
			if (pressedKeys.has('s')) socket.emit('player_move', { playerId: 'player1', direction: 'down' });
			if (pressedKeys.has('arrowup')) socket.emit('player_move', { playerId: 'player2', direction: 'up' });
			if (pressedKeys.has('arrowdown')) socket.emit('player_move', { playerId: 'player2', direction: 'down' });
		}
	}
	
	// Always continue the animation loop, even when paused
	movePlayersFrame = requestAnimationFrame(movePlayers);
}

function handleKeyDown(e: KeyboardEvent) {
	if (gameEnded) return;
	
	// Let pauseManager handle pause-related keys first
	if (pauseManager.handleKeyDown(e)) {
		return; // Key was handled by pause manager
	}
	
	// Don't handle movement keys when paused
	if (pauseManager.getState().gamePaused) return;
	
	pressedKeys.add(e.key.toLowerCase());
	console.log('keydown:', e.key.toLowerCase());
}

function handleKeyUp(e: KeyboardEvent) {
	// Don't handle movement keys when paused
	if (pauseManager.getState().gamePaused) return;
	
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

	// Clean up pause UI
	if (pauseManager) {
		pauseManager.cleanup();
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

	// Initialize pause manager
	pauseManager = new PauseManager();

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
	canvas.tabIndex = 0; // Make canvas focusable
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
				!aliasRegistered &&
				window.location.search.includes('tournament=true')
			) {
				promptAliasRegistration();
			}
		}
	});
	window.addEventListener('beforeunload', cleanupGame);

	window.addEventListener('beforeunload', () => {
		if (aliasRegistered && socket && socket.connected) {
			socket.emit('leave_tournament');
		}
	});
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState ==='hidden' && aliasRegistered && socket && socket.connected) {
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
	const tournamentMode = urlParams.get('tournament') === 'true';
	const localTournamentMode = urlParams.get('tournament') === 'local';

	if (urlParams.get('tournament') === 'true') {
		// Clear any existing reset dialogs immediately
		document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());

		// Reset tournament state
		aliasRegistered = false;
		inTournament = false;

		// DON'T call promptAliasRegistration() here - let the connect handler do it
	}
	aiMode = urlParams.get('mode') === 'ai';

	// Socket connection to connect with Remote players
	const backendUrl = `https://${window.location.hostname}:8443`;
	socket = io(backendUrl, {
		// transports: ['websocket'],
		// secure: true,
		query: {
			token: localStorage.getItem('jwtToken'),
			local: (!tournamentMode && !aiMode && !localTournamentMode).toString(), // "true" for local, "false" for tournament or AI
			mode: aiMode ? 'ai' : (tournamentMode ? 'tournament' : (localTournamentMode ? 'local_tournament' : 'local'))
		}
	});

	// Setup tournament handlers
	setupTournamentHandlers();
	setupLocalTournamentHandlers();
	
	// Initialize pause manager with socket and setup handlers
	pauseManager.updateSocket(socket);
	pauseManager.setupPauseHandlers();
	
	// Update pause manager state for current game mode
	pauseManager.updateState({
		inTournament: tournamentMode,
		inLocalTournament: localTournamentMode
	});
	
	// Set up callback to ensure controls work after resume
	pauseManager.setOnResumeCallback(() => {
		// Clear any stuck keys from before pause
		pressedKeys.clear();
		
		// Ensure game canvas has focus and controls are responsive
		if (canvas) {
			canvas.focus();
		}
		
		// Force a small delay to ensure the UI is ready
		setTimeout(() => {
			console.log('Game controls restored after resume, movePlayers loop should be running');
		}, 50);
	});

	// Socket event handlers
	socket.on('connect', () => {
		console.log('✅ Connected:', socket!.id);

		gameEnded = true;
		matchStarted = false;
		inLocalTournament = false;
		currentMatch = null;
		pauseManager.cleanup(); // Clean up pause state on connect

		// Cancel any running game loop
		if (movePlayersFrame !== null) {
			cancelAnimationFrame(movePlayersFrame);
			movePlayersFrame = null;
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
		
		if (!tournamentMode && !localTournamentMode) {
			socket!.emit('restart_game');
			gameEnded = false;
			matchStarted = true;
			pauseManager.updateState({ matchStarted: true, gameEnded: false });
			pauseManager.createPauseButton(); // Create pause button for local match
			if (movePlayersFrame === null) movePlayers();
		} else if (localTournamentMode) {
			// Local Tournament mode
			inLocalTournament = true;
			promptLocalTournamentSetup();
		} else {
			// Remote Tournament mode
			if (wasInTournamentReconnect) {
				// We were previously in a tournament before server restart
				console.log('Detected tournament reconnection after server restart');
				aliasRegistered = wasAliasRegistered;
			}
			
			if (!aliasRegistered) {
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
		assignedPlayerId = playerId;
		if (movePlayersFrame === null) movePlayers();
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
				if (inTournament) {
					sessionStorage.setItem('tournament_reconnect', 'true');
					sessionStorage.setItem('tournament_alias_registered', aliasRegistered.toString());
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
		if (inTournament && !aliasRegistered) {
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

			let winner: string | { alias: string } = 'Unknown';
			let winnerId: string = '';
			
			if (state.score.player1 >= 5) {
				winner = inTournament && currentMatch ? currentMatch[0] : 'Player 1';
				if (
					inLocalTournament &&
					currentMatch &&
					typeof currentMatch[0] === 'object' &&
					currentMatch[0] !== null &&
					'id' in currentMatch[0] &&
					typeof currentMatch[0].id === 'string'
				) {
					winnerId = currentMatch[0].id;
				} else {
					winnerId = '';
				}
			} else if (state.score.player2 >= 5) {
				winner = inTournament && currentMatch ? currentMatch[1] : 'Player 2';
				if (
					inLocalTournament &&
					currentMatch &&
					typeof currentMatch[1] === 'object' &&
					currentMatch[1] !== null &&
					'id' in currentMatch[1] &&
					typeof currentMatch[1].id === 'string'
				) {
					winnerId = currentMatch[1].id;
				} else {
					winnerId = '';
				}
			}

			// Save tournament results
			if (inTournament && currentMatch) {
				tournamentResults.push({
					player1: typeof currentMatch[0] === 'object' && currentMatch[0] !== null ? currentMatch[0].alias : currentMatch[0],
					player2: typeof currentMatch[1] === 'object' && currentMatch[1] !== null ? currentMatch[1].alias : currentMatch[1],
					score1: state.score.player1,
					score2: state.score.player2
				});
			}

			showGameOverScreen(winner);
			gameEnded = true;
			pauseManager.updateState({ gameEnded: true });
			pauseManager.cleanup(); // Clean up pause UI when game ends

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
			} else if (inTournament && currentMatch) { 
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