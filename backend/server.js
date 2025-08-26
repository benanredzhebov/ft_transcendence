/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: pfalli <pfalli@student.42wolfsburg.de>     +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:35:06 by beredzhe          #+#    #+#             */
/*   Updated: 2025/07/09 11:54:00 by pfalli           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs'
import { existsSync, readFileSync } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import fastifyFormbody from '@fastify/formbody';
import fastifyCors from '@fastify/cors';
import { Server } from 'socket.io';
import GameEngine from './GameLogic/GameEngine.js';
import Tournament from './GameLogic/Tournament.js';
import LocalTournamentMode from './GameLogic/LocalTournamentMode.js';
import GameState from './GameLogic/GameState.js';
import hashPassword from './crypto/crypto.js';
import DB from './data_controller/dbConfig.js';
import {developerRoutes, credentialsRoutes} from './routes/routes.js'; // Import the routes
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET || 'hbj2io4@@#!v7946h3&^*2cn9!@09*@B627B^*N39&^847,1';

let countdownInterval = null;

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// -------------------------------move to another file------------------------------------------------------------------------


// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}
const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
	fs.mkdirSync(avatarsDir, { recursive: true });
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(avatarsDir)) {
	fs.mkdirSync(avatarsDir, { recursive: true });
}

// -------------------------------------------------------------------------------------------------------

const PORT = 8443;
const HOST = '0.0.0.0'; // Bind to all network interfaces

// Load SSL certificates
const keyPath = join(__dirname, 'https_keys/private-key.pem');
const certPath = join(__dirname, 'https_keys/certificate.pem');

if (!existsSync(keyPath) || !existsSync(certPath)) {
	console.error(`Error: SSL certificate files not found at ${keyPath} or ${certPath}.`);
	console.error('Please ensure the certificates exist or adjust the paths in server.js.');
	process.exit(1);
}

const httpsOptions = {
	key: readFileSync(keyPath),
	cert: readFileSync(certPath),
};

const app = fastify({
	logger: false,
	https: httpsOptions,
});

const server = app.server; // Get the underlying HTTPS server
const io = new Server(server, {
	cors: { origin: '*' }, // Allow all origins for Socket.IO
});

// ***** Game Logic (WebSocket + Game Loop)*******
let tournament = null;
let localTournament = null;
const game = new GameEngine();

// Map of online users: socketId -> { userId, username, alias, blocked:Set }
const onlineUsers = new Map();

// Server startup cleanup
function initializeServer() {
	// Reset any existing tournament state on server restart
	if (tournament) {
		console.log('Server restart detected - resetting tournament state');
		tournament.reset();
		tournament = null;
	}
	if (localTournament) {
		console.log('Server restart detected - resetting local tournament state');
		localTournament.reset();
		localTournament = null;
	}
	// Reset game state before the game loop starts
	game.resetGame();
	// Ensure gameOver is false and score is zeroed before any game loop tick
	console.log('Server initialized - all states reset');
}

// Call initialization on server start
initializeServer();

// Local Tournament Game Loop
setInterval(() => {
	if (localTournament && localTournament.gameEngine) {
		const updatedState = localTournament.updateGame();
		if (updatedState && localTournament.socketId) {
			io.to(localTournament.socketId).emit('state_update', updatedState);
		}
	}
}, 16); // 60 FPS

// Improved countdown function with cleanup
function startSynchronizedCountdown(io, duration = 5) {
	let remaining = duration;
	
	// Clear any existing countdown
	if (countdownInterval) {
		clearInterval(countdownInterval);
		countdownInterval = null;
	}
	
	countdownInterval = setInterval(() => {
		io.emit('countdown_update', remaining);
		remaining--;
	
		if (remaining < 0) {
			clearInterval(countdownInterval);
			countdownInterval = null;

			setTimeout(() => {
				game.startMatch(); // Use GameEngine's method
				if (tournament && tournament.currentMatch) {
					const [p1, p2] = tournament.currentMatch;
					const alias1 = p1 && p1[1] && p1[1].alias ? p1[1].alias : 'Unknown';
					const alias2 = p2 && p2[1] && p2[1].alias ? p2[1].alias : 'Bye';
					console.log(`Match started ${alias1} vs ${alias2}`);
				}
				io.emit('start_match');
			}, 1000);
		}
	}, 1000);
	return countdownInterval;
}

io.on('connection', (socket) => {
	console.log('Client connected:', socket.id);
	
	// Detect if it's local match
	const isLocalMatch = 
		socket.handshake.query.local === 'true' ||
		socket.handshake.query.local === true;
	const gameMode = socket.handshake.query.mode || 'local';
	const isLocalTournament = gameMode === 'local_tournament';
	
	game.setTournamentMode(!isLocalMatch && !isLocalTournament, gameMode);
	
	// Check if client might have been in a tournament before server restart
	if (gameMode === 'tournament') {
		// If no tournament exists on server but client is connecting in tournament mode,
		// it likely means server was restarted during a tournament
		if (!tournament) {
			socket.emit('tournament_reset', { 
				reason: 'Server was restarted during tournament. All tournament states have been cleared.' 
			});
		}
	}
	
	// Add player with error handling CHECK THIS LATER!
	if (isLocalMatch) {
		if (!game.addPlayer(socket.id)) {
			socket.emit('error', { message: 'Game is full' });
			socket.disconnect();
			return;
		}
		console.log('Connected players:', Array.from(game.state.connectedPlayers));
	}
	

	//Emit state_update after both players are present
	if (!game.isTournament && game.state.connectedPlayers.size === 1) {
		io.emit('state_update', game.getState());
	}


	socket.on('authenticate_chat', (token) => {
		if (!token) {
		socket.emit('auth_error', { message: 'Authentication token not provided.' });
		return;
		}
		try {
			const decoded = jwt.verify(token, JWT_SECRET);

			// Prevent duplicate user sessions
			const isAlreadyOnline = [...onlineUsers.values()].some(user => user.userId === decoded.userId);
			if (isAlreadyOnline) {
				console.log(`User ${decoded.username} is already connected.`);
				// Filter out the current user from the list
				const onlineList = Array.from(onlineUsers.entries())
					.filter(([id, u]) => u.userId !== decoded.userId)
					.map(([id, u]) => ({ socketId: id, userId: u.userId, username: u.username, alias: u.alias }));
				socket.emit('online_users', onlineList);
				return;
			}

			const user = {
				userId: decoded.userId,
				username: decoded.username,
				alias: decoded.username,
				blocked: new Set(),
			};
			onlineUsers.set(socket.id, user); // <-- Add User
			console.log(`User authenticated for session: ${user.username} (${socket.id})`);

			// Notify all clients about the updated user list (excluding themselves)
			onlineUsers.forEach((_, socketId) => {
				const currentUser = onlineUsers.get(socketId);
				if (currentUser) {
					const onlineList = Array.from(onlineUsers.entries())
						.filter(([id, u]) => u.userId !== currentUser.userId)
						.map(([id, u]) => ({ 
							socketId: id, 
							alias: u.alias, 
							userId: u.userId, 
							username: u.username 
						}));
					
					io.to(socketId).emit('online_users', onlineList);
				}
			});
			console.log(`DEBUG: Broadcasting personalized online_users. Total unique users: ${onlineUsers.size}`);
		} catch (e) {
			console.error('Chat authentication failed:', e.message);
			socket.emit('auth_error', { message: 'Authentication failed' });
		}
	});

	socket.on('request_online_users', () => {
		const currentUser = onlineUsers.get(socket.id);
		if (currentUser) {
			const onlineList = Array.from(onlineUsers.entries())
				.filter(([id, u]) => u.userId !== currentUser.userId)
				.map(([id, u]) => ({ 
					socketId: id, 
					alias: u.alias, 
					userId: u.userId, 
					username: u.username 
				}));
			
			socket.emit('online_users', onlineList);
		}
	});

	socket.on('player_move', ({ direction, playerId }) => {
		game.handlePlayerInput(playerId, direction);
		io.emit('state_update', game.getState());
	});
	
	socket.on('restart_game', () => {
		game.resetGame();
		game.resume();
		io.emit('state_update', game.getState());
	});

	// ***new: added token + data for Match Data***
	socket.on('register_alias', ({ alias, token }) => { // + token
		if (!token) {
			socket.emit('alias_registered', { success: false, message: 'Authentication required.' });
			return;
		}

		try {
			const decodedToken = jwt.verify(token, JWT_SECRET);
			const user = { userId: decodedToken.userId, username: decodedToken.username };

			if (!tournament) tournament = new Tournament();
		
			const success = tournament.registerPlayer(socket.id, alias, user);
			
			if (success) {
				// *** i deleted this part because onlineUsers is already populated in authenticate_chat, in Dashboard ***
				socket.emit('alias_registered', { success: true });
				// onlineUsers.set(socket.id, { userId: user.userId, username: user.username, alias, blocked: new Set() });
				// const onlineList = Array.from(onlineUsers.entries()).map(([id, u]) => ({ socketId: id, alias: u.alias, userId: u.userId, username: u.username }));
				// io.emit('online_users', onlineList);

				const playerList = Array.from(tournament.players.entries()).map(([socketId, {alias, userId, username}]) => ({
					socketId,
					alias,
					userId,
					username
				}));
				io.emit('player_list_updated', playerList);

				console.log('Players in lobby:', Array.from(tournament.players.values()).map(p => p.alias)); // Del
				
				// Only show the lobby dialog, do not start the match yet
				io.emit('tournament_lobby', {
					message: tournament.canStartTournament() && tournament.rounds.length === 0
						? 'Ready to start tournament?'
						: 'Waiting for more players to join...',
					players: Array.from(tournament.players.values()).map(p => p.alias)
				});
			} else {
				// Check if it's a duplicate user or duplicate alias
				const existingUserIds = [...tournament.players.values()].map(p => p.userId);
				const existingAliases = [...tournament.players.values()].map(p => p.alias);
				
				if (existingUserIds.includes(user.userId)) {
					socket.emit('alias_registered', { success: false, message: 'You are already registered in this tournament.' });
				} else if (existingAliases.includes(alias)) {
					socket.emit('alias_registered', { success: false, message: 'Alias already taken. Please choose another name.' });
				} else {
					socket.emit('alias_registered', { success: false, message: 'Registration failed.' });
				}
			}
		} catch (e) {
			socket.emit('alias_registered', { success: false, message: 'Invalid token.' });
		}
	});


	socket.on('leave_tournament', () => {
		if (tournament && tournament.players.has(socket.id)) {
			const player = tournament.players.get(socket.id);
			console.log(`Player ${player?.alias} leaving tournament`);

			// Remove player from tournament
			tournament.removePlayer(socket.id);

			// Update player list for remaining players
			const playerList = Array.from(tournament.players.entries()).map(([socketId, {alias, userId, username}]) => ({
				socketId,
				alias,
				userId,
				username
			}));

			io.emit('player_list_updated', playerList);

			// Update lobby status
			if (tournament.players.size === 0) {
				// No players left, reset tournament
				tournament.reset();
				tournament = null;
				io.emit('tournament_lobby_closed');
			} else {
				// Update lobby message for remaining players
				io.emit('tournament_lobby', {
				message: tournament.canStartTournament() && tournament.rounds.length === 0
					? 'Ready to start tournament?'
					: 'Waiting for more players to join...',
				players: Array.from(tournament.players.values()).map(p => p.alias)
			});
		}

		// Remove from online users alias
		const user = onlineUsers.get(socket.id);
		if (user) {
			delete user.alias;
			onlineUsers.set(socket.id, user);
		}

		// Update online users list
		const onlineList = Array.from(onlineUsers.entries()).map(([id, u]) => ({
			socketId: id,
			alias: u.alias,
			userId: u.userId,
			username: u.username
		}));
		io.emit('online_users', onlineList);
	}
});

socket.on('player_inactive', () => {
	// Optional: Handle tab switching - you might want to keep player registered
	// or remove them after a timeout
	console.log(`Player ${socket.id} became inactive`);
});

	socket.on('private_message', async ({ targetSocketId, message }) => { // Make handler async
			const sender = onlineUsers.get(socket.id);
			const recipient = onlineUsers.get(targetSocketId);
			if (!sender || !recipient) return;
			if (recipient.blocked && recipient.blocked.has(sender.userId)) return;

			try {
				await DB('chat_messages').insert({
					sender_id: sender.userId,
					recipient_id: recipient.userId,
					message_text: message
				});
			} catch (error) {
				console.error('Failed to save chat message:', error);
			}

			io.to(targetSocketId).emit('private_message', { from: socket.id, message, username: sender.username, userId: sender.userId });
	});

	socket.on('block_user', ({ targetUserId }) => {
			const user = onlineUsers.get(socket.id);
			if (user) {
					user.blocked.add(targetUserId);
					// Notify the client that the user was blocked
					socket.emit('user_blocked', { targetUserId, message: `You have blocked this user.` });
			}
	});

	socket.on('unblock_user', ({ targetUserId }) => {
			const user = onlineUsers.get(socket.id);
			if (user) {
				user.blocked.delete(targetUserId);
				// Notify the client that the user was unblocked
				socket.emit('user_unblocked', { targetUserId, message: `You have unblocked this user.` });
			}
	});

	socket.on('invite_to_game', ({ targetSocketId }) => {
			const sender = onlineUsers.get(socket.id);
			if (!sender) return;
			io.to(targetSocketId).emit('game_invite', { from: socket.id, alias: sender.alias, userId: sender.userId });
	});

	// Administrative tournament reset - can be triggered for testing or emergency cleanup
	socket.on('admin_reset_tournament', ({ token }) => {
		if (!token) return;
		
		try {
			const decodedToken = jwt.verify(token, JWT_SECRET);
			// Add admin check here if needed - for now any authenticated user can reset
			
			console.log(`Tournament reset requested by user ${decodedToken.username} (${socket.id})`);
			
			if (tournament) {
				// Cancel any active countdown
				if (countdownInterval) {
					clearInterval(countdownInterval);
					countdownInterval = null;
					io.emit('countdown_cancelled');
				}
				
				// Notify all clients about the reset
				io.emit('tournament_reset', { 
					reason: 'Tournament was manually reset by administrator' 
				});
				
				// Reset tournament state
				tournament.reset();
				tournament = null;
				
				// Reset game state
				game.resetGame();
				game.pause();
				
				console.log('Tournament has been manually reset');
			} else {
				socket.emit('admin_response', { message: 'No active tournament to reset' });
			}
		} catch (e) {
			socket.emit('admin_response', { message: 'Invalid authentication for admin action' });
		}
	});


	socket.on('send_public_tournament_invite', ({ targetSocketId }) => {
		const sender = onlineUsers.get(socket.id);
		const recipient = onlineUsers.get(targetSocketId);

		if (!sender || !recipient) {
			console.log('Could not find sender or recipient for tournament invite.');
			return;
		}

        const payload = {
            senderAlias: sender.alias,
			senderSocketId: socket.id
        };

        // Send the special invite message to both users' chat windows
        io.to(socket.id).emit('receive_public_tournament_invite', payload);
        io.to(targetSocketId).emit('receive_public_tournament_invite', payload);
    });

	socket.on('dismiss_lobby_invite', ({ senderSocketId }) => {
    	const sender = onlineUsers.get(senderSocketId);
    	if (sender) {
    	    io.to(senderSocketId).emit('lobby_invite_dismissed', { message: 'Your match invite was dismissed.' });
    	}
	});

	// Start tournament when someone clicks "Start Tournament"
	socket.on('start_tournament', () => {
		if (!tournament) return;
		
		if (tournament.rounds.length === 0) {
			try {
				tournament.generateInitialBracket();
				console.log('Tournament bracket generated successfully');
			} catch (e) {
				// Notify the client about the error, do not crash the server
				socket.emit('tournament_error', { message: e.message });
				tournament.reset(); // ***new: Reset the tournament state
				io.emit('tournament_cancelled'); // ***new: Notify clients
				return;
			}
			
			const currentMatch = tournament.getCurrentMatchPlayers();
			console.log('Current match players:', {
				player1: currentMatch.player1 ? `${currentMatch.player1.alias} (${currentMatch.player1.socketId})` : null,
				player2: currentMatch.player2 ? `${currentMatch.player2.alias} (${currentMatch.player2.socketId})` : null
			});
			
			game.prepareForMatch();
			
			// Emit the dynamic bracket to all clients
			const dynamicBracket = tournament.getDynamicBracket();
			io.emit('tournament_bracket', dynamicBracket);
			
			io.emit('match_announcement', {
				player1: currentMatch.player1.alias,
				player2: currentMatch.player2 ? currentMatch.player2.alias : 'Bye'
			});
			
			// Send ready prompt only to the players in the current match
			if (currentMatch.player1) {
				io.to(currentMatch.player1.socketId).emit('await_player_ready');
			}
			if (currentMatch.player2) {
				io.to(currentMatch.player2.socketId).emit('await_player_ready');
			}
		}
	});

	socket.on('player_ready', () => {
		if (!tournament) return;
		
		const player = tournament.players.get(socket.id);
		console.log(`Player ready: ${player ? player.alias : 'Unknown'} (${socket.id})`);
		
		tournament.markPlayerReady(socket.id);
		
		const currentMatch = tournament.getCurrentMatchPlayers();
		console.log('Current match ready status:', {
			player1: currentMatch.player1 ? `${currentMatch.player1.alias}: ${currentMatch.player1.isReady}` : null,
			player2: currentMatch.player2 ? `${currentMatch.player2.alias}: ${currentMatch.player2.isReady}` : null,
			allReady: tournament.allPlayersReady()
		});
	
		if (tournament.allPlayersReady() ) {
			console.log('All players ready! Starting countdown...');
			const currentMatch = tournament.getCurrentMatchPlayers();
			if (currentMatch.player1) 
				io.to(currentMatch.player1.socketId).emit('assign_controls', 'player1');
			if (currentMatch.player2)
				io.to(currentMatch.player2.socketId).emit('assign_controls', 'player2');
				startSynchronizedCountdown(io);
		}
	});

	socket.on('host_start_next_match', () => {
		if (!tournament) return;

		// Only allow host to trigger
		const { player1, player2 } = tournament.getCurrentMatchPlayers();
		if (!player1 || socket.id !== player1.socketId) return;

		// Reset ready state for both players
		tournament.resetPlayersReady(player1.socketId, player2 && player2.socketId);

		game.resetGame();

		// Emit the reset state to all clients
		io.emit('state_update', game.getState());

		// Debug log: show which sockets will receive the event
		console.log('Emitting await_player_ready to:', player1.socketId, player2 && player2.socketId);

		// Now prompt both players to get ready
		io.to(player1.socketId).emit('await_player_ready');
		if (player2) io.to(player2.socketId).emit('await_player_ready');
	});
	
	socket.on('match_ended', async ({ winnerSocketId }) => {
		if (!tournament?.currentMatch) {
			console.warn('match_ended received but no current match');
			return;
		}

		const state = game.getState();
		if (state.score.player1 === 0 && state.score.player2 === 0) {
			console.warn('Ignoring match_ended: no score change');
			return;
		}

		// *** FIX: Capture match data BEFORE advancing the tournament ***
		const { player1, player2 } = tournament.getCurrentMatchPlayers();
		const winner = winnerSocketId === player1.socketId ? player1 : player2;
		
		if (player1 && player2) {
			try {
				const matchDataToSave = {
					player1_id: player1.userId,
					player2_id: player2.userId,
					player1_username: player1.alias,
					player2_username: player2.alias,
					player1_score: state.score.player1,
					player2_score: state.score.player2,
					winner_id: winner.userId,
					winner_username: winner.alias,
					is_tournament: true,
				};
				console.log('[DEBUG] Saving match data to DB:', matchDataToSave);
				await DB('matchHistory').insert(matchDataToSave);
				console.log('Match history saved successfully.');
			} catch (error) {
				console.error('Failed to save match history:', error);
			}
		}

		// Now, advance the tournament to the next match
		const gameScores = { player1: state.score.player1, player2: state.score.player2 };
		let nextMatch = tournament.recordWinner(winnerSocketId, gameScores);

		// Loop to skip byes and auto-advance until a real match or tournament end
		while (nextMatch && (!nextMatch[0] || !nextMatch[1])) {
			const autoWinner = nextMatch[0] ? nextMatch[0][0] : nextMatch[1][0];
			nextMatch = tournament.recordWinner(autoWinner); // No scores for bye matches
		}

		if (nextMatch) {
			const { player1: nextP1, player2: nextP2 } = tournament.getCurrentMatchPlayers();
			game.prepareForMatch();

			// Reset readiness for the new match
			tournament.resetReadyForCurrentMatch();

			// Emit updated bracket after match completion
			const dynamicBracket = tournament.getDynamicBracket();
			io.emit('tournament_bracket', dynamicBracket);

			if (nextP1 && nextP2) {
				io.emit('match_announcement', { 
					player1: nextP1.alias,
					player2: nextP2.alias
				});
				io.to(nextP1.socketId).emit('await_player_ready');
				io.to(nextP2.socketId).emit('await_player_ready');
			}
		} else {
			const finalWinnerData = tournament.winners[0];
			const finalWinnerAlias = finalWinnerData && finalWinnerData[1] ? finalWinnerData[1] : 'Unknown';
			const allMatchResults = tournament.getAllMatchResults();
				// Emit the final bracket with completed state and champion before tournament_over
				const finalBracket = tournament.getDynamicBracket();
				io.emit('tournament_bracket', finalBracket);
				io.emit('tournament_over', { 
					winner: finalWinnerAlias,
					allMatches: allMatchResults 
				});
				tournament.reset(); // Reset for the next tournament
		}
	});

	// ===== LOCAL TOURNAMENT HANDLERS =====
	
	socket.on('init_local_tournament', ({ playerNames }) => {
		try {
			if (!localTournament) {
				localTournament = new LocalTournamentMode();
			}
			
			localTournament.initializeTournament(socket.id, playerNames);
			localTournament.generateInitialBracket();
			
			const status = localTournament.getTournamentStatus();
			socket.emit('local_tournament_initialized', status);
			console.log(`Local tournament initialized with ${playerNames.length} players`);
		} catch (error) {
			socket.emit('local_tournament_error', { message: error.message });
		}
	});

	socket.on('start_local_tournament_match', () => {
		try {
			if (!localTournament || !localTournament.currentMatch) {
				throw new Error('No active local tournament match');
			}

			const matchInfo = localTournament.startCurrentMatch();
			
			if (matchInfo && matchInfo.gameState) {
				// Real match, not a bye
				socket.emit('local_tournament_match_started', matchInfo);
				socket.emit('state_update', matchInfo.gameState);
			} else {
				// Bye match was handled automatically, get updated status
				const status = localTournament.getTournamentStatus();
				socket.emit('local_tournament_status_update', status);
			}
		} catch (error) {
			socket.emit('local_tournament_error', { message: error.message });
		}
	});

	socket.on('local_tournament_player_move', ({ direction, playerId }) => {
		try {
			if (!localTournament || !localTournament.gameEngine) {
				return;
			}

			localTournament.handleGameInput({ direction, playerId });
			socket.emit('state_update', localTournament.getGameState());
		} catch (error) {
			console.error('Local tournament player move error:', error.message);
			socket.emit('local_tournament_error', { message: error.message });
		}
	});

	socket.on('local_tournament_match_ended', ({ winnerId, scores }) => {
		try {
			if (!localTournament) {
				throw new Error('No active local tournament');
			}

			const nextMatch = localTournament.recordWinner(winnerId, scores);
			const status = localTournament.getTournamentStatus();

			if (localTournament.isFinished) {
				socket.emit('local_tournament_finished', {
					winner: status.winner,
					allMatches: status.matchHistory,
					bracket: status.bracket
				});
			} else if (nextMatch) {
				socket.emit('local_tournament_next_match', {
					match: localTournament.getCurrentMatchPlayers(),
					status: status
				});
			} else {
				socket.emit('local_tournament_error', { message: 'No next match available' });
			}
		} catch (error) {
			socket.emit('local_tournament_error', { message: error.message });
		}
	});

	socket.on('get_local_tournament_status', () => {
		if (localTournament) {
			const status = localTournament.getTournamentStatus();
			socket.emit('local_tournament_status_update', status);
		} else {
			socket.emit('local_tournament_error', { message: 'No active local tournament' });
		}
	});

	socket.on('reset_local_tournament', () => {
		if (localTournament) {
			localTournament.reset();
			localTournament = null;
			socket.emit('local_tournament_reset');
			console.log('Local tournament reset');
		}
	});

	socket.on('start_local_tournament', () => {
		console.log('Starting new local tournament for socket:', socket.id);
	
		// Reset any existing local tournament state
		if (localTournament) {
			localTournament.reset();
			localTournament = null;
		}
	
		// Create new local tournament
		localTournament = new LocalTournamentMode();
	
		// Send the initial setup screen
		socket.emit('local_tournament_setup');
	});

	// ===== END LOCAL TOURNAMENT HANDLERS =====

	socket.on('disconnect', () => {
		console.log('Client disconnected:', socket.id);
		game.removePlayer(socket.id)
		onlineUsers.delete(socket.id);
		const onlineList = Array.from(onlineUsers.entries()).map(([id, u]) => ({ socketId: id, alias: u.alias, userId: u.userId, username: u.username }));
		io.emit('online_users', onlineList);

		if (tournament) {
			const disconnectedPlayer = tournament.players.get(socket.id);
			
			// If player is not in tournament, skip tournament logic
			if (!disconnectedPlayer) {
				return;
			}
			
			console.log(`Tournament player ${disconnectedPlayer.alias} (${socket.id}) disconnecting. Tournament finished: ${tournament.isFinished}, Players remaining: ${tournament.players.size}`);
			
			// If tournament is already finished, just clean up silently
			if (tournament.isFinished) {
				console.log('Tournament already finished, removing player silently');
				tournament.removePlayer(socket.id);
				
				// Only reset tournament when ALL players have left a finished tournament
				if (tournament.players.size === 0) {
					console.log('All players left finished tournament, cleaning up');
					tournament.reset();
				}
				return; // Exit early for finished tournaments
			}
			
			// Cancel any active countdown if a tournament player disconnects
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
				io.emit('countdown_cancelled');
			}
			
			// Check if current match player disconnected
			if (tournament.currentMatch) {
				const [p1, p2] = tournament.currentMatch;
				const isPlayerInMatch = socket.id === p1[0] || socket.id === p2?.[0];
				
				if (isPlayerInMatch) {
					console.log('Player in match disconnected:', socket.id, 'Match:', p1, p2);
					
					// Determine the winner (the opponent who didn't disconnect)
					const winnerSocketId = socket.id === p1[0] ? p2?.[0] : p1[0];
					const winnerData = winnerSocketId ? tournament.players.get(winnerSocketId) : null;
					const loserAlias = disconnectedPlayer?.alias || 'Unknown Player';
					
					console.log('Forfeit details:', { winnerSocketId, winnerData: winnerData?.alias, loserAlias });
					
					if (winnerData && winnerSocketId) {
						try {
							// First, pause the game to stop any ongoing match
							game.paused = true;
							game.resetGame();
							
							// Record the forfeit victory with forfeit scores
							const forfeitScores = { 
								player1: socket.id === p1[0] ? 0 : 5, 
								player2: socket.id === p2?.[0] ? 0 : 5 
							};
							
							// Don't remove the disconnected player yet - recordWinner needs to validate
							let nextMatch = tournament.recordWinner(winnerSocketId, forfeitScores);
							
							// Loop to skip byes and auto-advance until a real match or tournament end
							while (nextMatch && (!nextMatch[0] || !nextMatch[1])) {
								const autoWinner = nextMatch[0] ? nextMatch[0][0] : nextMatch[1][0];
								nextMatch = tournament.recordWinner(autoWinner); // No scores for bye matches
							}
							
							io.emit('match_forfeit', {
								winner: winnerData.alias,
								loser: loserAlias,
								reason: 'Player disconnected'
							});
							
							// Update bracket display
							const bracket = tournament.getDynamicBracket();
							io.emit('tournament_bracket', bracket);
							
							// Add delay to show forfeit message before proceeding
							setTimeout(() => {
								// Remove player from tournament AFTER forfeit processing
								tournament.removePlayer(socket.id);
								
								if (tournament.isFinished) {
									const finalWinnerAlias = tournament.tournamentWinner?.[1] || 'Unknown';
									const allMatchResults = tournament.getAllMatchResults();
									io.emit('tournament_over', { 
										winner: finalWinnerAlias,
										allMatches: allMatchResults 
									});
									tournament.reset();
								} else if (nextMatch) {
									// Announce the next match using the same logic as match_ended
									const { player1: nextP1, player2: nextP2 } = tournament.getCurrentMatchPlayers();
									game.prepareForMatch();
									
									// Reset readiness for the new match
									tournament.resetReadyForCurrentMatch();
									
									if (nextP1 && nextP2) {
										io.emit('match_announcement', { 
											player1: nextP1.alias,
											player2: nextP2.alias
										});
										io.to(nextP1.socketId).emit('await_player_ready');
										io.to(nextP2.socketId).emit('await_player_ready');
									}
								} else {
									// Check if this was the final match (only 1 player left after disconnect)
									if (tournament.players.size === 1) {
										// If only 1 player remains and tournament was in progress, they win by forfeit
										const remainingPlayer = Array.from(tournament.players.values())[0];
										if (remainingPlayer) {
											tournament.isFinished = true;
											tournament.tournamentWinner = [remainingPlayer.userId, remainingPlayer.alias];
											const allMatchResults = tournament.getAllMatchResults();
											io.emit('tournament_over', { 
												winner: remainingPlayer.alias,
												allMatches: allMatchResults 
											});
											tournament.reset();
										}
									} else if (tournament.players.size < 2 && !tournament.isFinished) {
										// Less than 2 players and tournament not finished = cancel
										tournament.reset();
										io.emit('tournament_cancelled', {
											reason: 'Not enough players remaining'
										});
									} else if (tournament.players.size === 0 && tournament.isFinished) {
										// All players have left a finished tournament, clean up
										tournament.reset();
									}
								}
							}, 3000); // 3 second delay to show forfeit message
						} catch (error) {
							console.error('Error handling forfeit:', error);
							game.paused = true;
							game.resetGame();
							io.emit('match_cancelled', {
								reason: 'Error processing forfeit: ' + error.message
							});
							// Remove player even on error
							tournament.removePlayer(socket.id);
						}
					} else {
						// No valid opponent found, cancel match
						console.log('No valid opponent found for forfeit:', { winnerSocketId, winnerData: winnerData?.alias, p1, p2 });
						game.paused = true;
						game.resetGame();
						io.emit('match_cancelled', {
							reason: 'Player disconnected, no valid opponent'
						});
						// Remove player when no opponent found
						tournament.removePlayer(socket.id);
					}
				} else {
					// Player disconnected but not in current match - just remove them
					tournament.removePlayer(socket.id);
					
					// Check if tournament should continue or be cancelled
					if (tournament.players.size === 1) {
						// If only 1 player remains and tournament was in progress, they win by forfeit
						const remainingPlayer = Array.from(tournament.players.values())[0];
						if (remainingPlayer) {
							tournament.isFinished = true;
							tournament.tournamentWinner = [remainingPlayer.userId, remainingPlayer.alias];
							const allMatchResults = tournament.getAllMatchResults();
							io.emit('tournament_over', { 
								winner: remainingPlayer.alias,
								allMatches: allMatchResults 
							});
							tournament.reset();
						}
					} else if (tournament.players.size < 2 && !tournament.isFinished) {
						// Less than 2 players and tournament not finished = cancel
						tournament.reset();
						io.emit('tournament_cancelled', {
							reason: 'Not enough players remaining'
						});
					} else if (tournament.players.size === 0 && tournament.isFinished) {
						// All players have left a finished tournament, clean up
						tournament.reset();
					}
				}
			} else {
				// No current match - just remove the player
				tournament.removePlayer(socket.id);
				
				// Check if tournament should continue or be cancelled  
				if (tournament.players.size === 1) {
					const remainingPlayer = Array.from(tournament.players.values())[0];
					if (remainingPlayer) {
						tournament.isFinished = true;
						tournament.tournamentWinner = [remainingPlayer.userId, remainingPlayer.alias];
						const allMatchResults = tournament.getAllMatchResults();
						io.emit('tournament_over', { 
							winner: remainingPlayer.alias,
							allMatches: allMatchResults 
						});
						tournament.reset();
					}
				} else if (tournament.players.size < 2 && !tournament.isFinished) {
					tournament.reset();
					io.emit('tournament_cancelled', {
						reason: 'Not enough players remaining'
					});
				} else if (tournament.players.size === 0 && tournament.isFinished) {
					// All players have left a finished tournament, clean up
					tournament.reset();
				}
			}
		}
	});
});

// Game loop
setInterval(() => {
	// Only run the game loop if both players are connected and game is not paused
	if (!game.paused && game.state.connectedPlayers && game.state.connectedPlayers.size === 2) {
		game.update(1 / 60);
		const state = game.getState();
		io.emit('state_update', game.getState());
		if (state.gameOver) {
			console.log('Game over! Final score:', state.score);
			game.paused = true;
			game.resetGame(); // Immediately reset after game over
		}
	}
}, 1000 / 60); // 60 times per second

// --- Middlewares ---
app.register(fastifyCors, { origin: true, credentials: true });

// Register Multipart
app.register(multipart, {
	limits: {
	fileSize: 7 * 1024 * 1024,
	}
});

app.register(fastifyFormbody);

// Serve uploaded avatars
app.register(fastifyStatic, {
	root: avatarsDir,
	prefix: '/uploads/avatars/', // URL prefix to access these files
	decorateReply: false // To avoid conflict if already decorated for other static serving
});

// Serve frontend static files
app.register(fastifyStatic, {
	root: join(__dirname, '../frontend/dist'),
	prefix: '/',
});


//--------Routes------------
developerRoutes(app);
credentialsRoutes(app);


// Fallback for SPA routing
app.setNotFoundHandler((req, reply) => {
	reply.sendFile('index.html'); // Serve index.html from the root specified in fastifyStatic
});


// --- Start Server ---
const start =  async () => {
	try{
		const address = await app.listen({ port: PORT, host: HOST });
		console.log("Server running " + address)
		console.log(`Access to school ${process.env.APP_URL}`)
		console.log(`*****path of avatars: ${avatarsDir}`)
	}
	catch (e){
		app.log.error(e);
		process.exit(1);
	}

}

start();