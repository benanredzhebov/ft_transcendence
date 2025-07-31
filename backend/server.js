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

const PORT = 3000;
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
const game = new GameEngine();

// Improved countdown function with cleanup
function startSynchronizedCountdown(io, duration = 10) {
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
	// console.log('Handshake query:', socket.handshake.query);
	
	// Detect if it's local match
	const isLocalMatch = 
		socket.handshake.query.local === 'true' ||
		socket.handshake.query.local === true;
	const gameMode = socket.handshake.query.mode || 'local';
	game.setTournamentMode(!isLocalMatch, gameMode);
	
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
            socket.emit('alias_registered', { success });

            if (success) {
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
                }
            else {
                socket.emit('tournament_waiting', {
                    message: 'Waiting for more players to join...',
                    playersNeeded: 2 - tournament.players.size
                });
            }
        } catch (e) {
            socket.emit('alias_registered', { success: false, message: 'Invalid token.' });
        }
	});

	// Start tournament when someone clicks "Start Tournament"
	socket.on('start_tournament', () => {
		if (!tournament) return;
		
		if (tournament.rounds.length === 0) {
			try {
				tournament.generateInitialBracket();
			} catch (e) {
				// Notify the client about the error, do not crash the server
				socket.emit('tournament_error', { message: e.message });
				tournament.reset(); // ***new: Reset the tournament state
                io.emit('tournament_cancelled'); // ***new: Notify clients
				return;
			}
			
			const currentMatch = tournament.getCurrentMatchPlayers();
			game.prepareForMatch();
			
			// Emit the bracket to all clients
			io.emit('tournament_bracket', {
				rounds: tournament.rounds.map(round =>
					round.map(([p1, p2]) => ({
						player1: p1 ? p1[1].alias : null,
						player2: p2 ? p2[1].alias : null
					}))
				)
			});
			
			io.emit('match_announcement', {
				player1: currentMatch.player1.alias,
				player2: currentMatch.player2 ? currentMatch.player2.alias : 'Bye'
			});
			io.emit('await_player_ready');
		}
	});

	socket.on('player_ready', () => {
		if (!tournament) return;
		tournament.markPlayerReady(socket.id);
	
		if (tournament.allPlayersReady() ) {
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
        let nextMatch = tournament.recordWinner(winnerSocketId);

        // Loop to skip byes and auto-advance until a real match or tournament end
        while (nextMatch && (!nextMatch[0] || !nextMatch[1])) {
            const autoWinner = nextMatch[0] ? nextMatch[0][0] : nextMatch[1][0];
            nextMatch = tournament.recordWinner(autoWinner);
        }

        if (nextMatch) {
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
            const finalWinnerData = tournament.winners[0];
            const finalWinnerAlias = finalWinnerData && finalWinnerData[1] ? finalWinnerData[1] : 'Unknown';
            io.emit('tournament_over', { winner: finalWinnerAlias });
            tournament.reset(); // Reset for the next tournament
        }
    });

    socket.on('disconnect', () => {
		console.log('Client disconnected:', socket.id);
		game.removePlayer(socket.id);
	
		if (tournament) {
			tournament.removePlayer(socket.id);
		
			// Check if current match player disconnected
			if (tournament.currentMatch) {
				const [p1, p2] = tournament.currentMatch;
				if (socket.id === p1[0] || socket.id === p2?.[0]) {
					game.resetGame();
					io.emit('match_cancelled');
				}
			}
			// End tournament if not enough players
			if (tournament.players.size < 2) {
				// tournament = null;
				tournament.reset(); // ***new:
				io.emit('tournament_cancelled');
			}
		}
	});
});

// Game loop
setInterval(() => {
	if (!game.paused) {
		game.update(1 / 60);
		const state = game.getState();
		io.emit('state_update', game.getState());
		
		if (state.gameOver) {
			console.log('Game over! Final score:', state.score);
			game.paused = true;
			// game.resetGame();
		}
	}
}, 1000 / 60); // 60 times per second

// --- Middlewares ---
app.register(fastifyCors, { origin: true, credentials: true });

// Register Multipart plugin
app.register(multipart, { // Now 'multipart' is defined
	// attachFieldsToBody: true,
	limits: {
	fileSize: 5 * 1024 * 1024, // 5MB
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
	root: join(__dirname, '../frontend/dist'), // Path to compiled frontend
	prefix: '/',
});


//--------Routes------------
developerRoutes(app);
credentialsRoutes(app);

// noHandlerRoute(app);
//-------------------------

// Fallback for SPA routing
app.setNotFoundHandler((req, reply) => {
	reply.sendFile('index.html'); // Serve index.html from the root specified in fastifyStatic
});


// --- Start Server ---
const start =  async () => {
	try{
		const address = await app.listen({ port: PORT, host: HOST });
		console.log("Server running " + address)
	}
	catch (e){
		app.log.error(e);
		process.exit(1);
	}

}

start();