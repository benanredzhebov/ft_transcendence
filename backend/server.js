/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:35:06 by beredzhe          #+#    #+#             */
/*   Updated: 2025/05/26 17:15:01 by beredzhe         ###   ########.fr       */
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
import hashPassword from './crypto/crypto.js';
import DB from './data_controller/dbConfig.js';

// let gamePaused = false; delete it

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


io.on('connection', (socket) => {
	console.log('Client connected:', socket.id);

	socket.on('player_move', ({ playerId, direction }) => {
		console.log(`Player ${playerId} moved ${direction}`);
		game.handlePlayerInput(playerId, direction);
	});

	socket.on('restart_game', () => {
		game.resetGame(); // Resets the score , ball paddles	
		io.emit('state_update', game.getState()); // Push to all clients
	});

	// Tournament Logic 
	socket.on('register_alias', (alias) => {
		if (!tournament) tournament = new Tournament();
		
		const success = tournament.registerPlayer(socket.id, alias);
		socket.emit('alias_registered', {success});

		if (success) {
			const playerList = Array.from(tournament.players.entries()).map(([socketId, alias]) => ({
				socketId,
				alias
			}));

			io.emit('player_list_updated', playerList);

			if (tournament.players.size >= 2 && tournament.matches.length === 0) {
				tournament.generateMatches();
				
				if (tournament.currentMatch) {
					const [player1, player2] = tournament.currentMatch;
					const [player1Socket] = player1;
					const [player2Socket] = player2;
					
					const matchData = tournament.currentMatch;
					game.resetGame();
					game.pause();
					
					io.emit('match_announcement', matchData); // still shows alias to everyone
					

					setTimeout(() => {
						game.resetGame();
						game.resume();
						io.to(player1Socket).emit('assign_controls', 'player1');
						io.to(player2Socket).emit('assign_controls', 'player2');
						io.emit('start_match'); //emit a new event like start_match after the countdown finishes on the server.
						io.emit('state_update', game.getState());
					}, 10000);
					
				}
			} else {
				socket.emit('tournament_waiting', {
					message: 'Waiting for more players to join the tournament...',
				});
			}
		}
	});
	
	socket.on('match_ended', () => {
		if (!tournament || !tournament.currentMatch) {
			// Prevent advancing if no match was started
			console.warn('match_ended received but no currentmatch exists');
			return;
		}
		
		const next = tournament.nextMatch();
		if (next) {
			const [player1, player2] = next;
			const [player1Socket] = player1;
			const [player2Socket] = player2;
			
			game.resetGame(); // reset scores and ball 
			game.pause(); // pause updates before match starts
			
			io.emit('match_announcement', next); // show aliases to all
			
			// Emit countdown start to both players
			io.to(player1Socket).emit('start_match');
			io.to(player2Socket).emit('start_match');
			
			setTimeout(() => {
				game.resume();
				io.to(player1Socket).emit('assign_controls', 'player1');
				io.to(player2Socket).emit('assign_controls', 'player2');
				io.emit('state_update', game.getState()); 
			}, 10000);
		} else {
			io.emit('tournament_over');
			tournament.resetTournament(); // Clear tournament after it's done
			tournament = null;
		}
	});

	socket.on('disconnect', () => {
		console.log('Client disconnected:', socket.id);
		
		if (tournament) {
			tournament.removePlayer(socket.id);
			const updatedList = Array.from(tournament.players.entries()).map(([socketId, alias]) => ({
				socketId,
				alias
			}));
			// const remaining = Array.from(tournament.players.values());
			// io.emit('player_list_updated', remaining);
			
			if (tournament.players.size < 2) {
				tournament.resetTournament();
				tournament = null;
			}
		}
		game.removePlayer(socket.id);
	});
});

// Game loop
setInterval(() => {
	if (!game.paused) {
		game.update(1 / 60);
		io.emit('state_update', game.getState());
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