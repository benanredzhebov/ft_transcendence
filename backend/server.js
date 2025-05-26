const fs = require('node:fs'); // Ensure fs is imported
const path = require('node:path'); // Ensure path is imported
const fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const fastifyFormbody = require('@fastify/formbody');
const fastifyCors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const { Server } = require('socket.io');
const DB = require('./data_controller/dbConfig');


const GameEngine = require('./gamelogic/GameEngine.js');

// included the friend and message  over here routes
const {developerRoutes, credentialsRoutes,noHandlerRoute, friendRoutes, messageRoutes} = require('./routes/routes'); // Import the routes

// Load SSL certificates
const keyPath = path.join(__dirname, 'https_keys/private-key.pem');
const certPath = path.join(__dirname, 'https_keys/certificate.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error(`Error: SSL certificate files not found at ${keyPath} or ${certPath}.`);
  console.error('Please ensure the certificates exist or adjust the paths in server.js.');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

const app = fastify({
  logger: false,
  https: httpsOptions,
});

const server = app.server; // Get the underlying HTTPS server
const io = new Server(server, {
  cors: { origin: '*' }, // Allow all origins for Socket.IO
});

const games = {};  
const onlineUsers = {};

io.on('connection', (socket) => {
	const roomId = socket.id;
	console.log('Client connected?: ', socket.id);
	socket.join(roomId);
	games[roomId] = new GameEngine();

	socket.on('player_move', ({ playerId, direction }) => {
	const game = games[roomId];
	if (game) {
		game.handlePlayerInput(playerId, direction);
	}
	});

	socket.on('start_game_with_friend', ({ friendId }) => {
	const friendSocketId = onlineUsers[friendId];
	if (!friendSocketId) {
		return socket.emit('error', { message: 'Friend is offline' });
	}
	const roomId = `game-${socket.id}-${friendId}`;
	games[roomId] = new GameEngine();

	// Assign player roles and send them
	io.to(socket.id).emit('game_start', { roomId, playerId: 'player1' });
	io.to(friendSocketId).emit('game_start', { roomId, playerId: 'player2' });
	socket.join(roomId);
	io.sockets.sockets.get(friendSocketId)?.join(roomId);
	});

	// chat messaging 
	socket.on('register', (userId) => {
	onlineUsers[userId] = socket.id;
	console.log(`User ${userId} is now online with socket ${socket.id}`);
	});
	socket.on('friend_block', async ({ blockerId, blockedId }) => {
    try {
		const updated = await DB('friends')
		.where({ user_id: blockerId, friend_id: blockedId })
		.update({ is_blocked: true });
		if (!updated) {
			socket.emit('error', { message: 'Failed to block user' });
			return;
		}
		socket.emit('friend_blocked', { blockedId });
		const blockedSocket = onlineUsers[blockedId];
		if (blockedSocket) {
			io.to(blockedSocket).emit('blocked_by', { by: blockerId });
		}
	} catch (err) {
		console.error('Error in friend_block:', err);
		socket.emit('error', { message: 'Block failed' });
	}
	});

  // Friend Unfriend
	socket.on('friend_unfriend', async ({ userId, friendId }) => {
	try {
		await DB('friends')
		.where(function () {
			this.where({ user_id: userId, friend_id: friendId })
            .orWhere({ user_id: friendId, friend_id: userId });
		})
		.del();
		socket.emit('friend_unfriended', { friendId });

	const friendSocket = onlineUsers[friendId];
	if (friendSocket) {
		io.to(friendSocket).emit('unfriended_by', { by: userId });
	}
	} catch (err) {
		console.error('Error in friend_unfriend:', err);
		socket.emit('error', { message: 'Unfriend failed' });
	}
  });

	// ----- Chat: Private Messaging -----
	socket.on('private_message', async ({ from, to, content }) => {
  try {
    // Optional: Check for block or friendship if you want
    const isBlocked = await DB('friends')
      .where(function () {
        this.where({ user_id: from, friend_id: to, is_blocked: true })
            .orWhere({ user_id: to, friend_id: from, is_blocked: true });
      })
      .first();

    if (isBlocked) {
      socket.emit('error', { message: 'You are blocked or have blocked this user' });
      return;
    }

    // Store message in DB
    await DB('messages').insert({
      sender_id: from,
      receiver_id: to,
      content
    });

    const messagePayload = {
      from,
      to,
      content,
      timestamp: new Date().toISOString()
    };

    // Always send to sender immediately
    socket.emit('message_received', messagePayload);

    // If receiver is online, send real-time
    const receiverSocket = onlineUsers[to];
    if (receiverSocket) {
      io.to(receiverSocket).emit('message_received', messagePayload);
    }

  } catch (error) {
    console.error('Error in private_message:', error);
    socket.emit('error', { message: 'Message failed to send' });
  }
});


  socket.on('friend_accept', async ({ fromUserId, toUserId }) => {
  try {
    const existing = await DB('friends')
      .where({ user_id: fromUserId, friend_id: toUserId })
      .first();

    if (!existing || existing.status !== 'pending') {
      socket.emit('error', { message: 'No pending request found' });
      return;
    }

    // Update the original request
    await DB('friends')
      .where({ user_id: fromUserId, friend_id: toUserId })
      .update({ status: 'accepted' });

    // Ensure reciprocal friend entry exists
    const reverseExists = await DB('friends')
      .where({ user_id: toUserId, friend_id: fromUserId })
      .first();

    if (reverseExists) {
      await DB('friends')
        .where({ user_id: toUserId, friend_id: fromUserId })
        .update({ status: 'accepted' });
    } else {
      await DB('friends').insert({
        user_id: toUserId,
        friend_id: fromUserId,
        status: 'accepted',
        is_blocked: false
      });
    }

	const senderSocket = onlineUsers[fromUserId];
	const receiverSocket = onlineUsers[toUserId];
	if (senderSocket) {
	  io.to(senderSocket).emit('friend_accepted', { by: toUserId });
	}
	if (receiverSocket) {
	  io.to(receiverSocket).emit('friend_accepted', { by: fromUserId }); 
	}

	} catch (err) {
	    console.error(err);
	    socket.emit('error', { message: 'Failed to accept friend request' });
	  }
});


  // ----- Handle Disconnection -----
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove game instance
    delete games[roomId];

    // Remove user from onlineUsers map
    for (const [userId, sockId] of Object.entries(onlineUsers)) {
      if (sockId === socket.id) {
        delete onlineUsers[userId];
        break;
      }
    }
  });
});


setInterval(() => {
  for (const [roomId, game] of Object.entries(games)) {
    game.update(1 / 60); // Update game logic
    io.to(roomId).emit('state_update', game.getState()); // Emit only to this room
  }
}, 1000 / 60); // 60 FPS


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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Serve uploaded avatars
app.register(fastifyStatic, {
  root: avatarsDir,
  prefix: '/uploads/avatars/', // URL prefix to access these files
  decorateReply: false // To avoid conflict if already decorated for other static serving
});

// Serve frontend static files
app.register(fastifyStatic, {
  root: path.join(__dirname, '../frontend/dist'), // Path to compiled frontend
  prefix: '/',
});

//--------Routes------------
developerRoutes(app);
credentialsRoutes(app);
noHandlerRoute(app);
messageRoutes(app);
friendRoutes(app);
//-------------------------

const PORT = 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces

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