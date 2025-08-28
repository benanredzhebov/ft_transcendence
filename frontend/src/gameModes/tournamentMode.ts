import { Socket } from 'socket.io-client';
import { showTournamentDialog, removeOverlays, showMatchInfo, showTournamentResults } from '../game/uiHelpers';
import { TournamentResult } from '../game/types';
import { movePlayers } from '../game';

// In tournamentMode.ts - Remove them and use dependency injection
interface TournamentDependencies {
	socket: Socket;
	gameState: {
		currentMatch: [string | { alias: string }, string | { alias: string }] | null;
		inTournament: boolean;
		matchStarted: boolean;
		gameEnded: boolean;
		countDownActive: boolean
		movePlayersFrame: number | null;
		tournamentResults: TournamentResult[];
		assignedPlayerId: 'player1' | 'player2' | null;
	};
	setGameState: (updates: Partial<TournamentDependencies['gameState']>) => void;
	promptAliasRegistration: () => void;
}

export class TournamentMode {
	private socket: Socket | null = null;
	private aliasMap: Record<string, string> = {};
	private gameState: TournamentDependencies['gameState'];
	private setGameState: TournamentDependencies['setGameState'];
	private promptAliasRegistration: () => void;
	public	aliasRegistered = false;

	constructor({ socket, gameState, setGameState, promptAliasRegistration }: TournamentDependencies) {
		this.socket = socket;
		this.setupTournamentHandlers();
		this.gameState = gameState;
		this.setGameState = setGameState;
		this.promptAliasRegistration = promptAliasRegistration;
	}


	private setupTournamentHandlers() {
		if (!this.socket) {
			console.error ('Cannot setup tournament handlers: socket is null');
			return;
		}

		this.socket.on('start_match', () => {
			this.setGameState({
				matchStarted:true,
				gameEnded: false,
				inTournament: true
			});
		});

		this.socket.on('player_list_updated', (players: { socketId: string, alias: string }[]) => {
			this.aliasMap = {};
			players.forEach(player => {
				this.aliasMap[player.socketId] = player.alias;
			});
		});

		this.socket.on('alias_registered', ({ success, message }) => {
			if (success) {
				this.aliasRegistered = true;
				this.setGameState({
					inTournament: true
				});
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
					this.promptAliasRegistration();
					};
				}
			}
		});

		this.socket.on('tournament_error', (data: { message: string }) => {
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

		this.socket.on('await_player_ready', () => {
			console.log('Received await_player_ready');
			removeOverlays();
		
			// Show tournament bracket before each match
			const bracketDiv = document.getElementById('tournament-bracket');
			if (bracketDiv) bracketDiv.style.display = 'block';
		
			this.setGameState({ assignedPlayerId: null });
			showTournamentDialog('Match ready!', {
				confirmText: 'I\'m Ready'
			}, this.socket);
		});

		this.socket.on('tournament_bracket', (data: { 
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

		this.socket.on('countdown_update', (remaining: number) => {
			console.log('Received countdown_update:' , remaining);
			this.updateCountdownDisplay(remaining);
		});

		this.socket.on('countdown_cancelled', () => {
			// Remove countdown dialog if it exists
			const dialog = document.querySelector('.tournament-dialog');
			if (dialog) dialog.remove();
			this.setGameState({
				countDownActive: false
			})
		});

		this.socket.on('match_announcement', (match: { player1: string, player2: string }) => {
			this.setGameState({currentMatch: [match.player1, match.player2] });
			showMatchInfo(match.player1, match.player2, 0, 0);
			this.setGameState({ assignedPlayerId: null });
		});

		this.socket.on('start_match', () => {
			removeOverlays();
			// Hide tournament bracket during gameplay
			const bracketDiv = document.getElementById('tournament-bracket');
			if (bracketDiv) bracketDiv.style.display = 'none';
		
			this.setGameState ({
				countDownActive: false, // added to start the match. Allow state updates to be rendered
				matchStarted: true,
				gameEnded: false
			});
			if (this.gameState.movePlayersFrame === null) movePlayers();
		});

	this.socket.on('tournament_over', ({ winner, allMatches }: { winner: any, allMatches: string[] }) => {
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
					this.setGameState({
						inTournament: false,
						currentMatch: null,
						assignedPlayerId: null
					});
					// Show the simple results overlay for final summary
					showTournamentResults(winnerName, allMatches, this.socket);
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
				showTournamentResults(winnerName, allMatches, this.socket);
				this.setGameState({
						inTournament: false,
						currentMatch: null,
						assignedPlayerId: null
					});
			};
		}
	});

	this.socket.on('match_forfeit', ({ winner, loser, reason }: { winner: string, loser: string, reason: string }) => {
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
			this.setGameState({
				inTournament: true
			});
			// Show tournament bracket again
			const bracketDiv = document.getElementById('tournament-bracket');
			if (bracketDiv) bracketDiv.style.display = 'block';
		}, 3000);
	});

	this.socket.on('match_cancelled', ({ reason }: { reason?: string }) => {
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

	this.socket.on('tournament_cancelled', ({ reason }: { reason?: string }) => {
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
			this.setGameState({
				inTournament: false,
				currentMatch: null,
				assignedPlayerId: null
				});
			
			this.aliasRegistered = false; // Reset alias registration
			
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
	this.socket.on('tournament_reset', ({ reason }: { reason?: string }) => {
		removeOverlays();
		document.getElementById('tournament-bracket')?.remove();
		
		const message = reason ? 
			`Tournament has been reset: ${reason}<br><br>All players and matches have been cleared.<br>You can start a new tournament.` :
			'Tournament has been reset by the server.<br><br>All players and matches have been cleared.<br>You can start a new tournament.';
		
		const dialog = showTournamentDialog(message, { confirmText: 'Return to Dashboard' });
		dialog.querySelector('button')!.onclick = () => {
			dialog.remove();
			this.setGameState({
				inTournament: false,
				currentMatch: null,
				assignedPlayerId: null
			});
			
			this.aliasRegistered = false; // Reset alias registration
			
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

	this.socket.on('tournament_lobby_closed', () => {
		console.log('Tournament lobby closed - no players remaining');

		// Reset tournament UI state
		const registerContainer = document.getElementById('register-container');
		const tournamentLobby = document.getElementById('tournament-lobby');
		const tournamentBracket = document.getElementById('tournament-bracket');

		if (registerContainer) registerContainer.style.display = 'block';
		if (tournamentLobby) tournamentLobby.style.display = 'none';
		if (tournamentBracket) tournamentBracket.style.display = 'none';

		this.aliasRegistered = false;
		this.setGameState({
			inTournament: false
		});
		

		// Show a message that tournament was closed
		showTournamentDialog('Tournament closed - no players remaining', {
			confirmText: 'OK',
			onConfirm: () => {
				// Optionally redirect to dashboard
				window.location.href = '/dashboard';
			}
		});
	});

	this.socket.on('tournament_lobby', ({ message, players, }) => {
		this.setGameState({
			tournamentResults: []
		});
		const	isHost = players.length > 0 && this.aliasMap && Object.values(this.aliasMap).includes(players[0]) && 
		Object.keys(this.aliasMap).find(key => this.aliasMap[key] === players[0]) === this.socket?.id;
		(players as string[]).forEach(alias => {
			if (!Object.values(this.aliasMap).includes(alias)) {
				this.aliasMap['unknown-' + alias] = alias;
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
				this.socket?.emit('start_tournament');
			};
		}
	});
}
	public updateCountdownDisplay(seconds: number) {
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

	public cleanup() {
		this.setGameState({
			inTournament: false,
			currentMatch: null,
			assignedPlayerId: null
		});
		
		this.aliasRegistered = false;
	}
}