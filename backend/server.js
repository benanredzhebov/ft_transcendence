/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:35:06 by beredzhe          #+#    #+#             */
/*   Updated: 2025/06/12 14:26:22 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import fs from 'fs'
import { existsSync, readFileSync } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart'
import fastifyFormbody from '@fastify/formbody';
import fastifyCors from '@fastify/cors';
import { Server } from 'socket.io';
import GameEngine from './GameLogic/GameEngine.js';
import Tournament from './GameLogic/Tournament.js';
import GameState from './GameLogic/GameState.js';
import hashPassword from './crypto/crypto.js';
import DB from './data_controller/dbConfig.js';

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
		
	game.setTournamentMode(!isLocalMatch);
	
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

	// socket.on('player_move', ({ direction, playerId }) => {
	// 	// console.log('player_move received:', playerId, direction);
	// 	if (!game.isTournament) {
	// 		// Local mode: move both paddles if keys are pressed
	// 		if (playerId === 'player1' || playerId === 'player2') {
	// 			game.handlePlayerInput(playerId, direction);
	// 			io.emit('state_update', game.getState());
	// 		}
	// 	} else {
	// 		// Tournament mode: trust playerId from frontend
	// 		if (playerId === 'player1' || playerId === 'player2') {
	// 			game.handlePlayerInput(playerId, direction);
	// 			io.emit('state_update', game.getState());
	// 			// console.log('Emitting state:', game.getState());
	// 		}
	// 	}
	// });

	socket.on('player_move', ({ direction, playerId }) => {
		game.handlePlayerInput(playerId, direction);
		io.emit('state_update', game.getState());
	});
	
	socket.on('restart_game', () => {
		game.resetGame();
		game.resume();
		io.emit('state_update', game.getState());
	});

	// Tournament Registration 
	socket.on('register_alias', (alias) => {
		if (!tournament) tournament = new Tournament();
	
		const success = tournament.registerPlayer(socket.id, alias);
		socket.emit('alias_registered', { success });

		if (success) {
			const playerList = Array.from(tournament.players.entries()).map(([socketId, {alias}]) => ({
				socketId,
				alias
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
	});

	// Start tournament when someone clicks "Start Tournament"
	socket.on('start_tournament', () => {
		if (!tournament) return;
		
		if (tournament.rounds.length === 0) {
			tournament.generateInitialBracket();
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
	
	socket.on('match_ended', ({ winnerSocketId }) => {
		if (!tournament?.currentMatch) {
			console.warn('match_ended received but no current match');
			return;
		}

	const state = game.getState();
	if (state.score.player1 === 0 && state.score.player2 === 0) {
		console.warn('Ignoring match_ended: no score change');
		return;
	}

	let nextMatch = tournament.recordWinner(winnerSocketId);

	// Loop to skip byes and auto-advance until a real match or tournament end
	while (nextMatch && (!nextMatch[0] || !nextMatch[1])) {
		const autoWinner = nextMatch[0] ? nextMatch[0][0] : nextMatch[1][0];
		nextMatch = tournament.recordWinner(autoWinner);
	}

	if (nextMatch) {
		const { player1, player2 } = tournament.getCurrentMatchPlayers();
		game.prepareForMatch();

		// Reset readiness for the new match
		tournament.resetReadyForCurrentMatch();

		if (player1 && player2) {
			io.emit('match_announcement', { 
				player1: player1.alias,
				player2: player2.alias
			});
			io.to(player1.socketId).emit('await_player_ready');
			io.to(player2.socketId).emit('await_player_ready');
		}
	} else {
		const winner = tournament.winners[0];
		const winnerAlias = winner && winner[1] ? winner[1] : 'Unknown';
		io.emit('tournament_over', { winner: winnerAlias });
		tournament = null;
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
				tournament = null;
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
	fileSize: 10 * 1024 * 1024, // 5MB
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

// Fallback for SPA routing
app.setNotFoundHandler((req, reply) => {
	reply.sendFile('index.html'); // Serve index.html from the root specified in fastifyStatic
});

// Health check route (optional but helpful)
app.get('/health', async (req, reply) => {
	reply.type('text/html').send(`
		<h1>Backend Server is Running (JS)</h1>
		<p>Fastify server is active at <code>https://${HOST}:${PORT}</code>.</p>
		<p>Socket.IO is listening for connections.</p>
	`);
});

// --- API Routes ---
app.get('/data', async (req, reply) => {
	try {
		const tables = await DB('credentialsTable');
		reply.send(tables);
	} catch (e) {
		console.error(e);
		reply.status(500).send({ error: 'Database fetch error' });
	}
});

app.post('/signUp', async (req, reply) => {
	const { username, email, password: rawPassword } = req.body;
	if (!username || !email || !rawPassword) {
		reply.status(400).send({ error: 'All fields (username, email, password) are required' });
		return;
	}

	try {
		const exists = await DB('credentialsTable')
			.where({ username })
			.orWhere({ email })
			.first();
		if (exists) {
			reply.status(400).send({ error: 'Username or email already in use' });
			return;
		}

		const password = hashPassword(rawPassword);
		const [id] = await DB('credentialsTable').insert({ username, email, password });
		reply.status(201).send({ success: true, id: id });
	} catch (e) {
		console.error(e);
		reply.status(500).send({ error: 'Signup failed due to server error' });
	}
});

app.post('/login', async (req, reply) => {
	const { email, password: rawPassword } = req.body;
	if (!email || !rawPassword) {
		reply.status(400).send({ error: 'Email and password are required' });
		return;
	}

	try {
		const user = await DB('credentialsTable').where({ email }).first();
		if (!user || user.password !== hashPassword(rawPassword)) {
			reply.status(401).send({ error: 'Invalid email or password' });
			return;
		}
		reply.send({ success: true, message: 'Login successful', userId: user.id });
	} catch (e) {
		console.error(e);
		reply.status(500).send({ error: 'Login failed due to server error' });
	}
});

app.post('/delete', async (req, reply) => {
	const { id } = req.body;
	if (!id || typeof id !== 'number') { // Basic validation
		reply.status(400).send({ error: 'A valid numeric ID is required' });
		return;
	}

	try {
		const deletedCount = await DB('credentialsTable').where({ id }).del();
		if (deletedCount > 0) {
				reply.send({ success: true, message: `User with ID ${id} deleted.` });
		} else {
				reply.status(404).send({ success: false, message: `User with ID ${id} not found.` });
		}
	} catch (e) {
		console.error(e);
		reply.status(500).send({ error: 'Delete operation failed due to server error' });
	}
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