const fs = require('node:fs');
const path = require('node:path');
const fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const fastifyFormbody = require('@fastify/formbody');
const fastifyCors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const GameEngine = require('./gamelogic/GameEngine.js');

const JWT_SECRET = process.env.JWT_SECRET || 'hbj2io4@@#!v7946h3&^*2cn9!@09*@B627B^*N39&^847,1'; // Ensure this is defined and matches

// routes
const {developerRoutes, credentialsRoutes,noHandlerRoute} = require('./routes/routes'); // Import the routes


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

const game = new GameEngine();
const onlineUsers = new Map(); // <userId, { username: string }>

io.on('connection', (socket) => {
  console.log('Client attempting to connect:', socket.id);

  const token = socket.handshake.auth.token;
  let decodedTokenPayload;

  if (token) {
    try {
      decodedTokenPayload = jwt.verify(token, JWT_SECRET);
      socket.userId = decodedTokenPayload.userId;
      socket.username = decodedTokenPayload.username; // Assuming username is in token
      console.log(`Socket ${socket.id} authenticated for user ${socket.userId} (Username: ${socket.username})`);

      // Add user to the list of online users
      if (socket.userId && socket.username) {
        onlineUsers.set(socket.userId, { username: socket.username });
        // Emit the updated list to all connected clients
        io.emit('online_users_update', Array.from(onlineUsers.values()));
        console.log('Online users:', Array.from(onlineUsers.values()));
      }

    } catch (err) {
      console.log(`Socket ${socket.id} authentication failed: Invalid token.`, err.message);
      socket.disconnect(true);
      return;
    }
  } else {
    console.log(`Socket ${socket.id} connection attempt without token. Disconnecting.`);
    socket.disconnect(true);
    return;
  }

  socket.on('player_move', ({ playerId, direction }) => {
    if (!socket.userId) {
      console.log(`Player move event from unauthenticated/unassociated socket ${socket.id}`);
      return; 
    }
    // Add validation if needed: e.g., ensure socket.userId matches the user controlling playerId
    console.log(`Player move from ${socket.username} (ID: ${socket.userId}): ${playerId} -> ${direction}`);
    game.handlePlayerInput(playerId, direction);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, User: ${socket.username || 'N/A'}, Reason: ${reason}`);
    // Remove user from the list of online users
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      // Emit the updated list to all connected clients
      io.emit('online_users_update', Array.from(onlineUsers.values()));
      console.log('Online users after disconnect:', Array.from(onlineUsers.values()));
    }
    // game.removePlayer(socket.id); // Or based on socket.userId if your game engine uses it
  });
});

// Game loop
setInterval(() => {
  game.update(1 / 60);
  io.emit('state_update', game.getState());
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