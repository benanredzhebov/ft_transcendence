const {Server} = require("socket.io");
const GameEngine = require("../gamelogic/GameEngine");
// const DB = require('../data_controller/dbConfig.js');

const gameSockets = (app) =>{
// ------------org version----------------

	const server = app.server; // Get the underlying HTTPS server

	const io = new Server(server, {
		cors: { origin: '*' }, // Allow all origins for Socket.IO
	});

	const game = new GameEngine();

	const connectedUsers = new Map();

	io.on('connection', (socket) => {
		console.log('Client connected:', socket.id);

		// get userr info and add to map
		socket.on('register_user', ({ userId }) => {
			connectedUsers.set(userId, socket.id);
			// You could also do socket.userId = userId if helpful.
			console.log(`User ${userId} registered on socket ${socket.id}`);
		});


		socket.on('player_move', ({ playerId, direction }) => {
			game.handlePlayerInput(playerId, direction);
		});

		socket.on('disconnect', () => {
			console.log('Client disconnected:', socket.id);
			// Handle player disconnection in the game engine if necessary
			// game.removePlayer(socket.id);
		});
	});

// Game loop
	setInterval(() => {
		game.update(1 / 60);
		io.emit('state_update', game.getState());
	}, 1000 / 60); // 60 times per second

// ------------org version----------------



// ----------------------testing-----------------------
//
// 	const server = app.server; // Get the underlying HTTPS server
// 	const io = new Server(server, {
// 		cors: { origin: '*' }, // Allow all origins for Socket.IO
// 	});
//
// 	const connectedUsers = new Map(); // Map to track connected users
//
// 	io.on('connection', (socket) => {
// 		console.log('A user connected: ' + socket.id);
//
// 		// Listen for user registration
// 		socket.on('register_user', async () => {
// 			try {
// 				const userId = DB('credentialsTable').where({ id } ).first();
// 				// Store the mapping of socket.id to userId
// 				connectedUsers.set(socket.id, userId);
// 				console.log(`User ${userId} registered on socket ${socket.id}`);
// 			} catch (err) {
// 				console.error('Error during user registration:', err);
// 			}
// 		});
//
// 		// Retrieve userId based on socket.id
// 		// socket.on('get_user_id', () => {
// 		// 	const userId = connectedUsers.get(socket.id);
// 		// 	if (userId) {
// 		// 		console.log(`UserId for socket ${socket.id}: ${userId}`);
// 		// 		socket.emit('user_id', { userId });
// 		// 	} else {
// 		// 		console.error(`No userId found for socket ${socket.id}`);
// 		// 	}
// 		// });
//
// 		// Handle disconnection
// 		socket.on('disconnect', () => {
// 			const userId = connectedUsers.get(socket.id);
// 			if (userId) {
// 				connectedUsers.delete(socket.id);
// 				console.log(`User ${userId} disconnected (Socket: ${socket.id})`);
// 			} else {
// 				console.log(`Socket ${socket.id} disconnected without a registered user`);
// 			}
// 		});
// 	});

	// ----------------------testing-----------------------


}

module.exports = {gameSockets};






// 	const server = app.server; // Get the underlying HTTPS server
//
// 	const io = new Server(server, {
// 		cors: { origin: '*' }, // Allow all origins for Socket.IO
// 	});
//
// 	const connectedUsers = new Map(); // Map to track connected users
//
//
// // ***** Game Logic (WebSocket + Game Loop)*******
// 	const game = new GameEngine();
//
// 	io.on('connection', (socket) => {
// 		console.log('Client connected:', socket.id);
// 		io
// 		// Handle user identification
// 		socket.on('register_user', ({ userId }) => {
// 			connectedUsers.set(userId, socket.id);
// 			console.log(`User registered: ${userId} (Socket: ${socket.id})`);
// 		});
// 		socket.on('player_move', ({ playerId, direction }) => {
// 			game.handlePlayerInput(playerId, direction);
// 		});
//
// 		socket.on('disconnect', () => {
// 			const userId = [...connectedUsers.entries()].find(([_, id]) => id === socket.id)?.[0];
// 			if (userId) {
// 				connectedUsers.delete(userId);
// 				console.log(`User disconnected: ${userId} (Socket: ${socket.id})`);
// 			}
// 		});
// 	});
//
//
// // Game loop
// 	setInterval(() => {
// 		game.update(1 / 60);
// 		io.emit('state_update', game.getState());
// 	}, 1000 / 60); // 60 times per second
//
//
// 	// Endpoint to check if a user is connected
// 	app.get('/is-user-connected', async (req, reply) => {
// 		const { userId } = req.query;
// 		const isConnected = connectedUsers.has(userId);
// 		reply.send({ userId, isConnected });
// 		console.log(userId);
// 	});
