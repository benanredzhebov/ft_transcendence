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
// let currentMatch: [string, string] | null = null;
let currentMatch: [string | { alias: string }, string | { alias: string }] | null = null;
let aliasMap: Record<string, string> = {};
let assignedPlayerId: 'player1' | 'player2' | null = null;
let movePlayersFrame: number | null = null;
let countDownActive = false;
let aliasRegistered = false;
let tournamentResults: { player1: string, player2: string, score1: number, score2: number}[] = [];
let localTournamentBracket: any = null; // New: To store local tournament state

// New Type Definition for Bracket Data
type BracketData = {
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
};

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
	options?: { confirmText?: string, timer?: number, onConfirm?: () => void,  showConfirm?: boolean  }
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

// New Function: Renders the tournament bracket UI
function renderBracket(data: BracketData) {
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
}

function setupTournamentHandlers() {
    if (!socket) return;

    // New handler for when the local tournament is first created
    socket.on('local_tournament_created', ({ bracket }) => {
        localTournamentBracket = bracket;
        inTournament = true;
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) gameContainer.style.display = 'block';
        
        updateLocalTournamentUI();
    });

    // New handler for when the local tournament is updated after a match
    socket.on('local_tournament_updated', ({ bracket }) => {
        localTournamentBracket = bracket;
        updateLocalTournamentUI();
    });

    socket.on('player_list_updated', (players: { socketId: string, alias: string }[]) => {
		aliasMap = {};
		players.forEach(player => {
			aliasMap[player.socketId] = player.alias;
		});
	});

    // New handler for local match announcements
    socket.on('match_announcement', (data: { player1: string, player2: string, isLocal?: boolean }) => {
        removeOverlays();
        const dialog = showTournamentDialog(`Next Match: ${data.player1} vs ${data.player2}`, {
            showConfirm: false // No button needed initially
        });

        // For local tournaments, add buttons to declare a winner
        if (data.isLocal) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '20px';

            const p1Button = document.createElement('button');
            p1Button.textContent = `${data.player1} Wins`;
            p1Button.onclick = () => {
                if (socket) socket.emit('local_match_winner_declared', { winnerAlias: data.player1, bracket: localTournamentBracket });
                dialog.remove();
            };

            const p2Button = document.createElement('button');
            p2Button.textContent = `${data.player2} Wins`;
            p2Button.onclick = () => {
                if (socket) socket.emit('local_match_winner_declared', { winnerAlias: data.player2, bracket: localTournamentBracket });
                dialog.remove();
            };

            buttonContainer.appendChild(p1Button);
            buttonContainer.appendChild(p2Button);
            dialog.querySelector('.dialog-content')!.appendChild(buttonContainer);
        }
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

    socket.on('tournament_bracket', (data: BracketData) => {
        renderBracket(data);
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
		if (movePlayersFrame === null) movePlayers();
	});

	socket.on('tournament_over', ({ winner, allMatches }: { winner: any, allMatches: string[] }) => {
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
		const message = reason ? `Tournament cancelled: ${reason}` : 'Tournament cancelled';
		const dialog = showTournamentDialog(message, { confirmText: 'Return to Dashboard' });
		dialog.querySelector('button')!.onclick = () => {
			dialog.remove();
			inTournament = false;
			currentMatch = null;
			assignedPlayerId = null;
			
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
	buttons.appendChild(dashboardBtn);
	
	overlay.appendChild(message);
	overlay.appendChild(buttons);
	canvas.parentElement.appendChild(overlay);
}

function showTournamentResults(winnerName: string, allMatches?: string[]) {
    removeOverlays();
    localTournamentBracket = null; // Clear local tournament state

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
    console.log('movePlayers running', Array.from(pressedKeys));
    if (!socket || gameEnded || (inTournament && !matchStarted)) return;

    //For tournament mode, check if match has started
    if (inTournament && !matchStarted) return;

    if (inTournament) {
        // For REMOTE tournaments, controls are assigned to one player
        if (assignedPlayerId === 'player1') {
            // console.log('1assignedPlayerId', assignedPlayerId);
            if (pressedKeys.has('w')) socket.emit('player_move', { playerId: 'player1', direction: 'up' });
            if (pressedKeys.has('s')) socket.emit('player_move', { playerId: 'player1', direction: 'down' });
        } else if (assignedPlayerId === 'player2') {
            // console.log('2assignedPlayerId', assignedPlayerId);
            if (pressedKeys.has('arrowup')) socket.emit('player_move', { playerId: 'player2', direction: 'up' });
            if (pressedKeys.has('arrowdown')) socket.emit('player_move', { playerId: 'player2', direction: 'down' });
        }
        // For LOCAL tournaments, one client controls both players
        else if (assignedPlayerId === 'local') {
            if (pressedKeys.has('w')) socket.emit('player_move', { playerId: 'player1', direction: 'up' });
            if (pressedKeys.has('s')) socket.emit('player_move', { playerId: 'player1', direction: 'down' });
            if (pressedKeys.has('arrowup')) socket.emit('player_move', { playerId: 'player2', direction: 'up' });
            if (pressedKeys.has('arrowdown')) socket.emit('player_move', { playerId: 'player2', direction: 'down' });
        }
    } else {
        // Local match controls (non-tournament)
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
    const localTournamentMode = urlParams.get('localTournament') === 'true';
    const aiMode = urlParams.get('mode') === 'ai';

    // Socket connection to connect with Remote players
    const backendUrl = `https://${window.location.hostname}:3000`;
    socket = io(backendUrl, {
        query: {
            token: localStorage.getItem('jwtToken'),
            local: (!tournamentMode && !aiMode).toString(),
            mode: aiMode ? 'ai' : (tournamentMode || localTournamentMode ? 'tournament' : 'local')
        }
    });

    // Setup tournament handlers
    setupTournamentHandlers();

    // Socket event handlers
    socket.on('connect', () => {
        console.log('Connected to server:', socket?.id);
        loading.remove();

        // If it's a remote tournament, prompt for alias
        if (tournamentMode) {
            inTournament = true;
            promptAliasRegistration();
        }
        // If it's a local tournament, start the setup flow
        else if (localTournamentMode) {
            startLocalTournament();
        }
        // For other modes, start the game loop immediately
        else {
            if (movePlayersFrame === null) {
                movePlayers();
            }
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
	removeOverlays();
	document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());
	document.getElementById('tournament-bracket')?.remove();
	document.querySelectorAll('.game-loading').forEach(el => el.remove());

	if (canvas?.parentElement) {
		const overlay = document.createElement('div');
		overlay.className = 'game-overlay';
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
		overlay.innerHTML = `
			<div style="color: white; font-size: 2rem; text-align: center;">
				Disconnected from server<br>
				<button id="reconnect-btn" style="margin-top: 1rem; padding: 0.5rem 1rem; font-size: 1rem;">Reconnect</button>
			</div>`;
		canvas.parentElement.appendChild(overlay);

		document.getElementById('reconnect-btn')?.addEventListener('click', () => {
			window.location.reload();
		});
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
			if (state.score.player1 >= 5) {
				winner = inTournament && currentMatch ? currentMatch[0] : 'Player 1';
			} else if (state.score.player2 >= 5) {
				winner = inTournament && currentMatch ? currentMatch[1] : 'Player 2';
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

// This is a new helper function you can add to your game.ts
export function startLocalTournament() {
    if (!socket) {
        alert('Not connected to server.');
        return;
    }

    const numPlayersStr = prompt("Enter number of players (2-8):");
    if (!numPlayersStr) return;

    const numPlayers = parseInt(numPlayersStr, 10);
    if (isNaN(numPlayers) || numPlayers < 2 || numPlayers > 8) {
        alert("Invalid number of players. Please enter a number between 2 and 8.");
        return;
    }

    const aliases: string[] = [];
    for (let i = 0; i < numPlayers; i++) {
        const alias = prompt(`Enter alias for Player ${i + 1}:`);
        if (!alias || aliases.includes(alias)) {
            alert("Invalid or duplicate alias. Please start over.");
            return;
        }
        aliases.push(alias);
    }

    socket.emit('create_local_tournament', { aliases });
    inTournament = true; // Set flag to true
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) gameContainer.style.display = 'block';
    const bracketDiv = document.getElementById('tournament-bracket');
    if (bracketDiv) bracketDiv.style.display = 'block';
}

// New UI helper for local tournaments
function updateLocalTournamentUI() {
    if (!localTournamentBracket) return;

    // Render the bracket and make it visible
    renderBracket(localTournamentBracket);
    const bracketDiv = document.getElementById('tournament-bracket');
    if (bracketDiv) bracketDiv.style.display = 'block';

    // Find the current match from the bracket data
    let currentMatchInfo = null;
    for (const round of localTournamentBracket.rounds) {
        const match = round.find((m: any) => m.isCurrent);
        if (match) {
            currentMatchInfo = match;
            break;
        }
    }

    if (currentMatchInfo && !currentMatchInfo.isComplete) {
        // 1. Show a "Start Match" dialog first
        removeOverlays();
        showTournamentDialog(`Next Match: ${currentMatchInfo.player1} vs ${currentMatchInfo.player2}`, {
            confirmText: 'Start Match',
            onConfirm: () => {
                // 2. When "Start Match" is clicked, tell the server to begin
                if (socket) {
                    socket.emit('start_local_match');
                }

                // 3. Show a persistent "Declare Winner" button on the screen
                const declareWinnerBtn = document.createElement('button');
                declareWinnerBtn.id = 'declare-winner-btn';
                declareWinnerBtn.textContent = 'End Match & Declare Winner';
                declareWinnerBtn.onclick = () => {
                    // 4. When this button is clicked, show the final winner dialog
                    const winnerDialog = showTournamentDialog(`Who won the match?`, { showConfirm: false });
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.marginTop = '20px';

                    const p1Button = document.createElement('button');
                    p1Button.textContent = `${currentMatchInfo.player1} Wins`;
                    p1Button.onclick = () => {
                        if (socket) socket.emit('local_match_winner_declared', { winnerAlias: currentMatchInfo.player1, bracket: localTournamentBracket });
                        winnerDialog.remove();
                        declareWinnerBtn.remove();
                    };

                    const p2Button = document.createElement('button');
                    p2Button.textContent = `${currentMatchInfo.player2} Wins`;
                    p2Button.onclick = () => {
                        if (socket) socket.emit('local_match_winner_declared', { winnerAlias: currentMatchInfo.player2, bracket: localTournamentBracket });
                        winnerDialog.remove();
                        declareWinnerBtn.remove();
                    };

                    buttonContainer.appendChild(p1Button);
                    buttonContainer.appendChild(p2Button);
                    winnerDialog.querySelector('.dialog-content')!.appendChild(buttonContainer);
                };
                document.body.appendChild(declareWinnerBtn);
            }
        });
    }
}