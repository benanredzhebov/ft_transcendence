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
const game = new GameEngine();
let activeGames = new Map();
let onlineUsers = new Map(); 

let currentGlobalGameMatchId = null; 

const JWT_SECRET = process.env.JWT_SECRET || 'hbj2io4@@#!v7946h3&^*2cn9!@09*@B627B^*N39&^847,1'; // Ensure this is defined and matches

const {developerRoutes, credentialsRoutes,noHandlerRoute} = require('./routes/routes'); // Import the routes

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

const server = app.server;
const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log('Client attempting to connect:', socket.id);

  const token = socket.handshake.auth.token;
  let decodedTokenPayload;

  if (token) {
    try {
      decodedTokenPayload = jwt.verify(token, JWT_SECRET);
      socket.userId = decodedTokenPayload.userId;
      socket.username = decodedTokenPayload.username;
      console.log(`Socket ${socket.id} authenticated for user ${socket.userId} (Username: ${socket.username})`);

      // Add user to the list of online users
      if (socket.userId && socket.username) {
        onlineUsers.set(socket.userId, { username: socket.username, socketId: socket.id }); // Store socket.id
        // Emit the updated list to all connected clients
        const usersToEmit = Array.from(onlineUsers.values());
        console.log('[DEBUG SERVER] Emitting online_users_update (on connect):', JSON.stringify(usersToEmit));
        io.emit('online_users_update', usersToEmit);
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

  socket.on('get_current_online_users', () => {
    const usersToEmit = Array.from(onlineUsers.values());
    console.log(`[DEBUG SERVER] Received get_current_online_users from ${socket.id}. Sending list:`, JSON.stringify(usersToEmit));
    socket.emit('online_users_update', usersToEmit);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, User: ${socket.username || 'N/A'}, Reason: ${reason}`);
    const disconnectedUserId = socket.userId;
    const disconnectedSocketId = socket.id;
    const disconnectedUsername = socket.username || 'Player';

    // Remove user from the list of online users
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      const usersToEmit = Array.from(onlineUsers.values());
      console.log('[DEBUG SERVER] Emitting online_users_update (on disconnect):', JSON.stringify(usersToEmit));
      io.emit('online_users_update', usersToEmit);
      console.log('Online users after disconnect:', usersToEmit);
    }

    // Handle game abandonment if player was in an active game
    for (const [gameId, game] of activeGames.entries()) {
      if (game.player1 === disconnectedSocketId || game.player2 === disconnectedSocketId) {
        // If the game hasn't had both players ready
        if (!game.player1Ready || !game.player2Ready) {
          const otherPlayerSocketId = (game.player1 === disconnectedSocketId) ? game.player2 : game.player1;
          const otherPlayerSocket = io.sockets.sockets.get(otherPlayerSocketId);
          if (otherPlayerSocket) {
            otherPlayerSocket.emit('opponent_disconnected_before_match_start', {
              gameId: gameId,
              message: `Your opponent (${disconnectedUsername}) disconnected before the match could start. The match is cancelled.`
            });
          }
          console.log(`[Game Cancelled] Player ${disconnectedSocketId} disconnected from game ${gameId} before both were ready. Game removed.`);
        } else if (game.player1Ready && game.player2Ready && !(game.gameActuallyStarted)) {
          const otherPlayerSocketId = (game.player1 === disconnectedSocketId) ? game.player2 : game.player1;
          const otherPlayerSocket = io.sockets.sockets.get(otherPlayerSocketId);
          if (otherPlayerSocket) {
            otherPlayerSocket.emit('opponent_disconnected_before_match_start', { // Can reuse this event
              gameId: gameId,
              message: `Your opponent (${disconnectedUsername}) disconnected just as the match was about to start. The match is cancelled.`
            });
          }
          console.log(`[Game Cancelled] Player ${disconnectedSocketId} disconnected from game ${gameId} after readying up but before gameplay. Game removed.`);
        } else {
          console.log(`[Player Disconnected In-Game] Player ${disconnectedSocketId} disconnected from active game ${gameId}.`);
          const otherPlayerSocketId = (game.player1 === disconnectedSocketId) ? game.player2 : game.player1;
          const otherPlayerSocket = io.sockets.sockets.get(otherPlayerSocketId);
          if (otherPlayerSocket) {
            otherPlayerSocket.emit('opponent_disconnected_mid_game', {
              gameId: gameId,
              message: `Your opponent (${disconnectedUsername}) disconnected during the game.`
            });
          }
        }
        activeGames.delete(gameId);
        break; 
      }
    }
  });

  // Listen for a user challenging another user
  socket.on('challenge_user', (data) => {
    const { challengerSocketId, challengedSocketId, challengedUsername } = data;
    const challengerUser = Array.from(onlineUsers.values()).find(u => u.socketId === challengerSocketId);
    const challengedUserSocket = io.sockets.sockets.get(challengedSocketId);

    if (!challengerUser) {
      console.log(`[Challenge] Challenger with socket ID ${challengerSocketId} not found in online users.`);
      socket.emit('challenge_error', { message: 'Could not identify you as an online user.' });
      return;
    }

    if (challengedUserSocket) {
      console.log(`[Challenge] User ${challengerUser.username} (ID: ${challengerSocketId}) is challenging ${challengedUsername} (ID: ${challengedSocketId})`);
      
      // Notify the challenged user
      challengedUserSocket.emit('incoming_challenge', {
        challengerUsername: challengerUser.username,
        challengerSocketId: challengerSocketId,
        message: `${challengerUser.username} has challenged you to a game!`
      });

      // Notify the challenger that the challenge was sent
      socket.emit('challenge_sent', { message: `Challenge sent to ${challengedUsername}. Waiting for response...` });

    } else {
      console.log(`[Challenge] Challenged user with socket ID ${challengedSocketId} not found or not connected.`);
      socket.emit('challenge_error', { message: `${challengedUsername} is not available or not online.` });
    }
  });

  // Listen for a user accepting a challenge
  socket.on('accept_challenge', (data) => {
    const { challengerSocketId, challengedSocketId } = data; // challengedSocketId is 'this' socket
    const challengerSocket = io.sockets.sockets.get(challengerSocketId);
    const challengedUser = Array.from(onlineUsers.values()).find(u => u.socketId === challengedSocketId);

    if (!challengerSocket) {
      socket.emit('game_setup_failed', { message: 'Challenger is no longer available.' });
      console.log(`[Accept Challenge] Challenger ${challengerSocketId} not found.`);
      return;
    }
    if (!challengedUser) {
        socket.emit('game_setup_failed', { message: 'Could not identify you as an online user for game setup.' });
        console.log(`[Accept Challenge] Challenged user ${challengedSocketId} (self) not found in onlineUsers map.`);
        return;
    }

    console.log(`[Accept Challenge] User ${challengedUser.username} (ID: ${challengedSocketId}) accepted challenge from ${challengerSocketId}.`);

    const gameId = `game_${challengerSocketId}_vs_${challengedSocketId}`;
    
    challengerSocket.join(gameId);
    socket.join(gameId);

    activeGames.set(gameId, {
        player1: challengerSocketId,
        player2: challengedSocketId,
        player1Ready: false,
        player2Ready: false,
        gameActuallyStarted: false // New flag
    });

    console.log(`[Game Confirmed] Game ${gameId} created for ${challengerSocketId} and ${challengedSocketId}. Waiting for players to ready up.`);

    io.to(gameId).emit('match_confirmed_get_ready', { 
        gameId: gameId,
        message: 'Challenge accepted! Prepare for the match and click "Start Match" when ready.',
        player1SocketId: challengerSocketId,
        player2SocketId: challengedSocketId 
    });
  });

  // Listen for a player signaling they are ready for the match
  socket.on('player_ready_for_match', (data) => {
    const { gameId } = data;
    const gameData = activeGames.get(gameId); // Renamed 'game' to 'gameData' to avoid conflict with global 'game' engine

    if (!gameData) {
      socket.emit('error_starting_match', { message: 'Game not found or has been cancelled.' });
      console.log(`[Player Ready] Socket ${socket.id} tried to ready for non-existent/cancelled game ${gameId}`);
      return;
    }

    if (gameData.gameActuallyStarted) {
      socket.emit('error_starting_match', { message: 'The game has already started.' });
      console.log(`[Player Ready] Socket ${socket.id} tried to ready for game ${gameId} which already started.`);
      return;
    }

    let playerRole = '';
    if (socket.id === gameData.player1) {
      if (gameData.player1Ready) {
        socket.emit('already_ready', { gameId: gameId, message: 'You have already indicated you are ready.' });
        return;
      }
      gameData.player1Ready = true;
      playerRole = 'Player 1';
    } else if (socket.id === gameData.player2) {
      if (gameData.player2Ready) {
        socket.emit('already_ready', { gameId: gameId, message: 'You have already indicated you are ready.' });
        return;
      }
      gameData.player2Ready = true;
      playerRole = 'Player 2';
    } else {
      socket.emit('error_starting_match', { message: 'You are not part of this game.' });
      console.log(`[Player Ready] Socket ${socket.id} is not part of game ${gameId}.`);
      return;
    }

    activeGames.set(gameId, gameData); // Update the map
    console.log(`[Player Ready] ${playerRole} (${socket.id}) is ready for game ${gameId}.`);

    // Notify the player that their "ready" status was received
    socket.emit('ready_acknowledged', { gameId: gameId, message: 'Your ready status is acknowledged. Waiting for opponent.' });

    // Notify the other player
    const otherPlayerSocketId = socket.id === gameData.player1 ? gameData.player2 : gameData.player1;
    const otherPlayerSocket = io.sockets.sockets.get(otherPlayerSocketId);
    if (otherPlayerSocket) {
        if (socket.id === gameData.player1 && gameData.player2Ready) { // Challenger just readied, challenged was already ready
             otherPlayerSocket.emit('opponent_ready_status', { gameId: gameId, message: `Challenger (${socket.username || 'Player 1'}) is now ready!` });
        } else if (socket.id === gameData.player2 && gameData.player1Ready) { // Challenged just readied, challenger was already ready
             otherPlayerSocket.emit('opponent_ready_status', { gameId: gameId, message: `Opponent (${socket.username || 'Player 2'}) is now ready!` });
        } else { // One player readied, other is not yet
            otherPlayerSocket.emit('opponent_ready_status', { gameId: gameId, message: `Your opponent (${socket.username || playerRole}) is ready and waiting for you.` });
        }
    }


    if (gameData.player1Ready && gameData.player2Ready) {
      gameData.gameActuallyStarted = true;
      activeGames.set(gameId, gameData); // Persist the gameActuallyStarted flag
      console.log(`[Match Start] Both players ready for game ${gameId}. Emitting 'start_actual_game'.`);
      
      // SET currentGlobalGameMatchId when a match officially starts
      currentGlobalGameMatchId = gameId;
      game.resetGame(); // Reset the global game engine for this new match
      game.state.gameOver = false;


      io.to(gameId).emit('start_actual_game', {
          gameId: gameId,
          message: 'Both players ready! Starting game...',
          player1SocketId: gameData.player1,
          player2SocketId: gameData.player2
      });
    }
  });

  // Listen for a user rejecting a challenge
  socket.on('reject_challenge', (data) => {
    const { challengerSocketId, challengedUsername } = data; // challengedUsername is the user who rejected
    const challengerSocket = io.sockets.sockets.get(challengerSocketId);

    if (challengerSocket) {
      console.log(`[Reject Challenge] User ${challengedUsername} rejected challenge from ${challengerSocketId}.`);
      challengerSocket.emit('challenge_rejected', {
        rejectedBy: challengedUsername,
        message: `${challengedUsername} rejected your challenge.`
      });
    } else {
      console.log(`[Reject Challenge] Challenger ${challengerSocketId} not found to notify of rejection.`);
    }
  });


  // Game related events (move these to a game engine or manager later)
  socket.on('player_move', (data) => {
    // IMPORTANT: Ensure data contains playerId and direction
    const { playerId, direction } = data; // Assuming data is { playerId: 'player1'|'player2', direction: 'up'|'down'}
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
    const disconnectedUserId = socket.userId;
    const disconnectedSocketId = socket.id;
    const disconnectedUsername = socket.username || 'Player';

    // Remove user from the list of online users
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      // Emit the updated list to all connected clients
      const usersToEmit = Array.from(onlineUsers.values());
      console.log('[DEBUG SERVER] Emitting online_users_update (on disconnect):', JSON.stringify(usersToEmit));
      io.emit('online_users_update', usersToEmit);
      console.log('Online users after disconnect:', usersToEmit);
    }

    // Handle game abandonment if player was in an active game
    for (const [gameId, game] of activeGames.entries()) {
      if (game.player1 === disconnectedSocketId || game.player2 === disconnectedSocketId) {
        // If the game hasn't had both players ready (i.e., match not fully started)
        if (!game.player1Ready || !game.player2Ready) {
          const otherPlayerSocketId = (game.player1 === disconnectedSocketId) ? game.player2 : game.player1;
          const otherPlayerSocket = io.sockets.sockets.get(otherPlayerSocketId);
          if (otherPlayerSocket) {
            otherPlayerSocket.emit('opponent_disconnected_before_match_start', {
              gameId: gameId,
              message: `Your opponent (${disconnectedUsername}) disconnected before the match could start. The match is cancelled.`
            });
          }
          console.log(`[Game Cancelled] Player ${disconnectedSocketId} disconnected from game ${gameId} before both were ready. Game removed.`);
        } else if (game.player1Ready && game.player2Ready && !(game.gameActuallyStarted)) {
          // Both were ready, but 'start_actual_game' might not have been processed by clients or game fully initialized
          const otherPlayerSocketId = (game.player1 === disconnectedSocketId) ? game.player2 : game.player1;
          const otherPlayerSocket = io.sockets.sockets.get(otherPlayerSocketId);
          if (otherPlayerSocket) {
            otherPlayerSocket.emit('opponent_disconnected_before_match_start', { // Can reuse this event
              gameId: gameId,
              message: `Your opponent (${disconnectedUsername}) disconnected just as the match was about to start. The match is cancelled.`
            });
          }
          console.log(`[Game Cancelled] Player ${disconnectedSocketId} disconnected from game ${gameId} after readying up but before gameplay. Game removed.`);
        } else {
          // Game was in progress
          console.log(`[Player Disconnected In-Game] Player ${disconnectedSocketId} disconnected from active game ${gameId}.`);
          const otherPlayerSocketId = (game.player1 === disconnectedSocketId) ? game.player2 : game.player1;
          const otherPlayerSocket = io.sockets.sockets.get(otherPlayerSocketId);
          if (otherPlayerSocket) {
            otherPlayerSocket.emit('opponent_disconnected_mid_game', {
              gameId: gameId,
              message: `Your opponent (${disconnectedUsername}) disconnected during the game.`
            });
          }
          // Consider game outcome logic here (e.g., other player wins by default)
        }
        activeGames.delete(gameId); // Remove game in all these disconnected scenarios for now
        break; 
      }
    }
  });

  // Join a specific game (for reconnection or direct join)
  socket.on('join_specific_game', (data) => {
    const { gameId } = data;
    if (!gameId) {
      socket.emit('error_joining_game', { message: 'No gameId provided.' });
      return;
    }

    const gameToJoin = activeGames.get(gameId);
    if (!gameToJoin) {
      socket.emit('error_joining_game', { message: `Game ${gameId} not found or not active.`});
      console.log(`[Join Specific Game] Socket ${socket.id} tried to join non-existent/inactive game ${gameId}`);
      return;
    }

    // Check if this player is one of the expected players for this game
    if (socket.id !== gameToJoin.player1 && socket.id !== gameToJoin.player2) {
        // Note: server.js stores player1 and player2 as socket IDs in activeGames
        // If you stored userId, you'd compare socket.userId
      socket.emit('error_joining_game', { message: 'You are not part of this game.' });
      console.log(`[Join Specific Game] Socket ${socket.id} is not part of game ${gameId}. Expected: ${gameToJoin.player1}, ${gameToJoin.player2}`);
      return;
    }
    
    // Player is valid for this game, ensure they are in the room
    // (They might already be if 'accept_challenge' put them there, but this is a good check)
    socket.join(gameId);
    console.log(`[Join Specific Game] Socket ${socket.id} (User: ${socket.username}) successfully joined/confirmed in game room: ${gameId}`);

    // If this join makes it the current game, ensure global ID is set
    // This might be redundant if 'start_actual_game' always precedes this for active games
    if (gameToJoin.gameActuallyStarted && currentGlobalGameMatchId !== gameId) {
         // This case needs careful thought: if a player joins a game that *was* active.
         // For now, 'start_actual_game' and 'request_rematch' are primary setters of currentGlobalGameMatchId.
    }
  });

  socket.on('request_rematch', (data) => {
    const { oldMatchId } = data;
    if (!oldMatchId) {
        socket.emit('rematch_error', { message: 'Old match ID not provided.' });
        return;
    }

    const oldGameData = activeGames.get(oldMatchId);
    if (!oldGameData) {
        socket.emit('rematch_error', { message: 'Original match not found.' });
        console.log(`[Rematch Request] Old match ${oldMatchId} not found.`);
        return;
    }

    const player1SocketId = oldGameData.player1;
    const player2SocketId = oldGameData.player2;

    const player1Socket = io.sockets.sockets.get(player1SocketId);
    const player2Socket = io.sockets.sockets.get(player2SocketId);

    if (!player1Socket || !player2Socket) {
        socket.emit('rematch_error', { message: 'One or both players from the original match are no longer connected.' });
        const stillConnectedPlayer = player1Socket || player2Socket;
        if (stillConnectedPlayer && stillConnectedPlayer.id !== socket.id) {
            stillConnectedPlayer.emit('rematch_error', { message: 'Opponent disconnected, cannot start rematch.'});
        }
        return;
    }
    
    const newGameState = game.resetGame(); // Resets global 'game' engine instance and returns new state
    // game.state.gameOver is already false from resetGame()

    const newMatchId = `game_${player1SocketId}_vs_${player2SocketId}_${Date.now()}`;

    activeGames.delete(oldMatchId);
    activeGames.set(newMatchId, {
        player1: player1SocketId,
        player2: player2SocketId,
        player1Ready: true, 
        player2Ready: true,
        gameActuallyStarted: true,
    });

    // Update the global game match ID
    currentGlobalGameMatchId = newMatchId;

    console.log(`[Rematch Started] New game ${newMatchId} for ${player1SocketId} and ${player2SocketId}. Old: ${oldMatchId}`);

    player1Socket.leave(oldMatchId);
    player2Socket.leave(oldMatchId);
    player1Socket.join(newMatchId);
    player2Socket.join(newMatchId);

    const eventData = {
        newMatchId: newMatchId,
        player1SocketId: player1SocketId,
        player2SocketId: player2SocketId,
        initialState: newGameState 
    };
    
    io.to(newMatchId).emit('rematch_started', eventData);
  });

});

// Game loop
setInterval(() => {
  if (currentGlobalGameMatchId && activeGames.has(currentGlobalGameMatchId)) {
    const currentGameData = activeGames.get(currentGlobalGameMatchId);
    if (currentGameData.gameActuallyStarted) {
        // The global 'game' instance is updated
        if (!game.state.gameOver) { // game is the global GameEngine instance
            game.update(1 / 60); 
        }
        // Emit the state of the global 'game' instance to the current match room
        io.to(currentGlobalGameMatchId).emit('state_update', game.getState());
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