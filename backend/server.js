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

const JWT_SECRET = process.env.JWT_SECRET || 'hbj2io4@@#!v7946h3&^*2cn9!@09*@B627B^*N39&^847,1';
const MAX_SCORE = 5; // Define MAX_SCORE, should match GameEngine if used there for ending

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
    logger: false, // Optionally true for more logs
    https: httpsOptions,
});

const io = new Server(app.server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"],
        credentials: true
    }
});

// --- In-memory stores ---
const onlineUsers = new Map(); // userId -> { userId, username, socketId, status: 'online' | 'in-game' | 'in-challenge' }
const pendingChallenges = new Map(); // challengedUserId -> { challengerUserId, challengerUsername, challengerSocketId, expiresAt }
const activeGames = new Map(); // gameId -> { engine: GameEngine, player1: { socketId, userId, username, ready: false }, player2: { socketId, userId, username, ready: false }, status: 'waiting' | 'active' | 'ended' }

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

            if (socket.userId && socket.username) {
                // If user is already in onlineUsers (e.g. reconnect with new socket), update socketId
                const existingUser = onlineUsers.get(socket.userId);
                if (existingUser) {
                    existingUser.socketId = socket.id;
                    // If they were in a game, their game instance would still have old socketId.
                    // This needs careful handling if rejoining games is a feature. For now, new connection = new context.
                    // If they were 'in-game' or 'in-challenge', their status might need reset if that context is lost.
                    // For simplicity, let's assume a reconnect might lose prior game/challenge state unless explicitly handled.
                    if (existingUser.status !== 'online') {
                         console.log(`User ${socket.username} reconnected, was ${existingUser.status}. Resetting to online.`);
                         existingUser.status = 'online'; // Or attempt to rejoin game if logic exists
                    }
                    onlineUsers.set(socket.userId, existingUser);
                } else {
                    onlineUsers.set(socket.userId, {
                        userId: socket.userId,
                        username: socket.username,
                        socketId: socket.id,
                        status: 'online'
                    });
                }
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

    socket.on('player_move', ({ gameId, playerId, direction }) => {
        if (!socket.userId) {
            console.log(`Player move event from unauthenticated/unassociated socket ${socket.id}`);
            return;
        }
        const gameInstance = activeGames.get(gameId);
        if (!gameInstance || gameInstance.status !== 'active') {
            // console.log(`Move for inactive/non-existent game ${gameId} by ${socket.username}`);
            return;
        }

        // Validate that the socket sending the move is the correct player for that game
        const playerMakingMove = (playerId === 'player1') ? gameInstance.player1 : gameInstance.player2;
        if (!playerMakingMove || playerMakingMove.socketId !== socket.id) {
            console.warn(`Socket ${socket.id} (User: ${socket.username}) attempted to move ${playerId} in game ${gameId} without authorization or player not found.`);
            return;
        }
        
        console.log(`Player move from ${socket.username} (ID: ${socket.userId}) for game ${gameId}: ${playerId} -> ${direction}`);
        gameInstance.engine.handlePlayerInput(playerId, direction);
    });

    socket.on('dashboard_request_online_users', () => {
        console.log(`Socket ${socket.id} (User: ${socket.username || 'N/A'}) requested online users list for dashboard.`);
        socket.emit('online_users_update', Array.from(onlineUsers.values()));
    });

    // --- Game Challenge Logic ---
    socket.on('initiate_challenge', ({ opponentUserId }) => {
        if (!socket.userId || !socket.username) return socket.emit('challenge_error', { message: 'Authentication required.' });
        
        const challenger = onlineUsers.get(socket.userId);
        const opponent = onlineUsers.get(opponentUserId);

        if (!challenger) return socket.emit('challenge_error', { message: 'Challenger not found in online users.'});
        if (!opponent) return socket.emit('challenge_error', { message: 'Opponent not found or is offline.' });
        if (opponent.status !== 'online') return socket.emit('challenge_error', { message: `Opponent is currently ${opponent.status}.`});
        if (challenger.status !== 'online') return socket.emit('challenge_error', { message: `You are currently ${challenger.status}. Cannot challenge.`});
        if (socket.userId === opponentUserId) return socket.emit('challenge_error', { message: 'You cannot challenge yourself.' });
        if (pendingChallenges.has(opponentUserId)) return socket.emit('challenge_error', {message: `${opponent.username} already has a pending challenge.`});


        console.log(`${challenger.username} (ID: ${socket.userId}) is challenging ${opponent.username} (ID: ${opponentUserId})`);

        challenger.status = 'in-challenge';
        opponent.status = 'in-challenge';
        onlineUsers.set(socket.userId, challenger);
        onlineUsers.set(opponentUserId, opponent);
        io.emit('online_users_update', Array.from(onlineUsers.values())); // Update status for all

        const challengeData = {
            challengerUserId: socket.userId,
            challengerUsername: socket.username,
            challengerSocketId: socket.id,
            expiresAt: Date.now() + 30000 // Challenge expires in 30 seconds
        };
        pendingChallenges.set(opponentUserId, challengeData);

        io.to(opponent.socketId).emit('challenge_received', { 
          challengerUserId: socket.userId,
          challengerUsername: socket.username 
        });
        socket.emit('challenge_initiated', { opponentUsername: opponent.username });

        // Timeout for challenge
        setTimeout(() => {
            if (pendingChallenges.has(opponentUserId) && pendingChallenges.get(opponentUserId)?.challengerUserId === socket.userId) {
                pendingChallenges.delete(opponentUserId);
                const currentChallenger = onlineUsers.get(socket.userId);
                const currentOpponent = onlineUsers.get(opponentUserId);
                if (currentChallenger && currentChallenger.status === 'in-challenge') {
                    currentChallenger.status = 'online';
                    onlineUsers.set(socket.userId, currentChallenger);
                }
                if (currentOpponent && currentOpponent.status === 'in-challenge') {
                    currentOpponent.status = 'online';
                    onlineUsers.set(opponentUserId, currentOpponent);
                }
                io.emit('online_users_update', Array.from(onlineUsers.values()));
                io.to(socket.id).emit('challenge_expired', { opponentUsername: opponent.username });
                io.to(opponent.socketId).emit('challenge_request_expired'); // Inform challenged user their incoming challenge expired
                console.log(`Challenge from ${socket.username} to ${opponent.username} expired.`);
            }
        }, 30000);
    });

    socket.on('challenge_response', ({ challengerUserId, accepted }) => {
        if (!socket.userId || !socket.username) return;

        const challengedUserResponding = onlineUsers.get(socket.userId);
        const challengeData = pendingChallenges.get(socket.userId);

        if (!challengedUserResponding) {
            console.error(`Challenge response from a user not in onlineUsers: ${socket.userId}`);
            socket.emit('challenge_error', { message: 'Error processing your response. Please try again.' });
            return;
        }

        if (!challengeData || challengeData.challengerUserId !== challengerUserId) {
            console.error(`Invalid challenge response: User ${socket.username} (ID: ${socket.userId}) responded to challenge from ${challengerUserId}, but pending challenge data does not match or is missing.`);
            socket.emit('challenge_error', { message: 'Invalid challenge data or challenge expired.' });
            return;
        }
        
        pendingChallenges.delete(socket.userId);

        const currentChallenger = onlineUsers.get(challengerUserId);
        const currentChallenged = onlineUsers.get(socket.userId); // Re-fetch

        if (!currentChallenger || !currentChallenged) {
            console.log(`Challenge response processed, but one or both players are no longer online. Challenger: ${challengerUserId}, Challenged: ${socket.userId}`);
            // Try to inform whoever is still online and reset their status.
            if (currentChallenger) {
                currentChallenger.status = 'online';
                onlineUsers.set(challengerUserId, currentChallenger);
                io.to(currentChallenger.socketId).emit('challenge_error', { message: 'Opponent disconnected before the challenge response could be fully processed.' });
            }
            if (currentChallenged) {
                currentChallenged.status = 'online';
                onlineUsers.set(socket.userId, currentChallenged);
                io.to(currentChallenged.socketId).emit('challenge_error', { message: 'Challenger disconnected before your response could be fully processed.' });
            }
            io.emit('online_users_update', Array.from(onlineUsers.values()));
            return;
        }

        if (accepted) {
            console.log(`${currentChallenged.username} accepted challenge from ${currentChallenger.username}`);
            
            currentChallenger.status = 'in-game';
            currentChallenged.status = 'in-game';
            onlineUsers.set(challengerUserId, currentChallenger);
            onlineUsers.set(socket.userId, currentChallenged);

            const gameId = `game_${currentChallenger.userId}_vs_${currentChallenged.userId}_${Date.now()}`;
            const newGameEngine = new GameEngine();
            
            activeGames.set(gameId, {
                engine: newGameEngine,
                player1: { socketId: currentChallenger.socketId, userId: currentChallenger.userId, username: currentChallenger.username, ready: false },
                player2: { socketId: currentChallenged.socketId, userId: currentChallenged.userId, username: currentChallenged.username, ready: false },
                status: 'waiting' // Game starts in 'waiting' state
            });
            console.log(`Game instance created for ${gameId}. Players: ${currentChallenger.username} vs ${currentChallenged.username}`);

            io.to(currentChallenger.socketId).emit('game_starting', {
                gameId,
                opponentUsername: currentChallenged.username,
                opponentUserId: currentChallenged.userId,
                role: 'player1'
            });
            io.to(currentChallenged.socketId).emit('game_starting', {
                gameId,
                opponentUsername: currentChallenger.username,
                opponentUserId: currentChallenger.userId,
                role: 'player2'
            });
        } else {
            console.log(`${currentChallenged.username} declined challenge from ${currentChallenger.username}`);
            currentChallenger.status = 'online';
            currentChallenged.status = 'online';
            onlineUsers.set(challengerUserId, currentChallenger);
            onlineUsers.set(socket.userId, currentChallenged);
            io.to(currentChallenger.socketId).emit('challenge_declined', { opponentUsername: currentChallenged.username });
        }
        io.emit('online_users_update', Array.from(onlineUsers.values()));
    });

    socket.on('player_ready_to_start', ({ gameId, playerRole }) => {
        if (!socket.userId || !socket.username) return;

        const gameInstance = activeGames.get(gameId);
        if (!gameInstance) {
            console.error(`Player ${socket.username} ready for non-existent game: ${gameId}`);
            socket.emit('game_error', { message: 'Game not found.' });
            return;
        }

        if (gameInstance.status !== 'waiting') {
            console.warn(`Player ${socket.username} sent ready for game ${gameId} that is not in 'waiting' state (current: ${gameInstance.status})`);
            return;
        }

        let playerToUpdate = null;
        if (playerRole === 'player1' && gameInstance.player1.userId === socket.userId) {
            playerToUpdate = gameInstance.player1;
        } else if (playerRole === 'player2' && gameInstance.player2.userId === socket.userId) {
            playerToUpdate = gameInstance.player2;
        }

        if (playerToUpdate) {
            playerToUpdate.ready = true;
            playerToUpdate.socketId = socket.id; // Update socketId in case of reconnect before ready
            console.log(`Player ${socket.username} (${playerRole}, ID: ${socket.userId}) is ready for game ${gameId}`);
        } else {
            console.error(`Mismatched playerRole/userId for game ${gameId}. Socket: ${socket.id}, User: ${socket.username}, Role: ${playerRole}`);
            return;
        }

        if (gameInstance.player1.ready && gameInstance.player2.ready) {
            gameInstance.status = 'active';
            gameInstance.engine.startGame(); // This will set engine status and serve ball
            
            const initialState = gameInstance.engine.getState();
            initialState.gameId = gameId; // Ensure gameId is part of the state

            console.log(`Game ${gameId} can start. Emitting 'game_can_start' to P1 (${gameInstance.player1.username}) and P2 (${gameInstance.player2.username})`);
            io.to(gameInstance.player1.socketId).emit('game_can_start', { gameId, initialState });
            io.to(gameInstance.player2.socketId).emit('game_can_start', { gameId, initialState });
        }
    });


    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, User: ${socket.username || 'N/A'}, Reason: ${reason}`);
        if (socket.userId) {
            // Handle pending challenges involving this user
            // (existing logic for pendingChallenges can remain largely the same)
            if (pendingChallenges.has(socket.userId)) {
                const challengeData = pendingChallenges.get(socket.userId);
                if (challengeData) {
                    const challenger = onlineUsers.get(challengeData.challengerUserId);
                    if (challenger) {
                        challenger.status = 'online';
                        onlineUsers.set(challengeData.challengerUserId, challenger);
                        io.to(challenger.socketId).emit('challenge_error', { message: `${socket.username || 'Opponent'} disconnected during challenge.` });
                    }
                }
                pendingChallenges.delete(socket.userId);
            }
            pendingChallenges.forEach((challenge, challengedId) => {
                if (challenge.challengerUserId === socket.userId) {
                    const challenged = onlineUsers.get(challengedId);
                    if (challenged) {
                        challenged.status = 'online';
                        onlineUsers.set(challengedId, challenged);
                        io.to(challenged.socketId).emit('challenge_request_cancelled'); // Inform challenged user
                    }
                    pendingChallenges.delete(challengedId);
                }
            });

            // Handle active games involving this user
            activeGames.forEach((gameInstance, gameId) => {
                let remainingPlayerSocketId = null;
                let disconnectedPlayerUsername = socket.username || "Opponent";

                if (gameInstance.player1.userId === socket.userId) {
                    remainingPlayerSocketId = gameInstance.player2.socketId;
                    disconnectedPlayerUsername = gameInstance.player1.username;
                } else if (gameInstance.player2.userId === socket.userId) {
                    remainingPlayerSocketId = gameInstance.player1.socketId;
                    disconnectedPlayerUsername = gameInstance.player2.username;
                }

                if (remainingPlayerSocketId) {
                    console.log(`Player ${disconnectedPlayerUsername} disconnected from game ${gameId}. Notifying other player.`);
                    io.to(remainingPlayerSocketId).emit('opponent_disconnected_from_game', { 
                        gameId, 
                        message: `${disconnectedPlayerUsername} has disconnected. Game over.` 
                    });
                    gameInstance.status = 'ended'; // Mark game as ended due to disconnect
                    // The game loop will handle cleanup of this 'ended' game.
                    
                    // Update status of remaining player in onlineUsers
                    const remainingPlayerUserId = gameInstance.player1.userId === socket.userId ? gameInstance.player2.userId : gameInstance.player1.userId;
                    const user = onlineUsers.get(remainingPlayerUserId);
                    if (user) {
                        user.status = 'online';
                        onlineUsers.set(remainingPlayerUserId, user);
                    }
                }
            });

            onlineUsers.delete(socket.userId);
            io.emit('online_users_update', Array.from(onlineUsers.values()));
            console.log('Online users after disconnect:', Array.from(onlineUsers.values()));
        }
    });
});

// Game loop
setInterval(() => {
    activeGames.forEach((gameInstance, gameId) => {
        if (gameInstance.status === 'active') {
            gameInstance.engine.update(1 / 60); // dt = 1/60 for 60 FPS
            const gameState = gameInstance.engine.getState();
            gameState.gameId = gameId; // Add gameId for client context

            // Emit to specific players in the game
            if (gameInstance.player1.socketId) {
                io.to(gameInstance.player1.socketId).emit('state_update', gameState);
            }
            if (gameInstance.player2.socketId) {
                io.to(gameInstance.player2.socketId).emit('state_update', gameState);
            }

            // Check for game over condition (score or engine's internal state)
            if (gameInstance.engine.status === 'ended' || gameState.score.player1 >= MAX_SCORE || gameState.score.player2 >= MAX_SCORE) {
                if (gameInstance.status !== 'ended') { // Ensure we only process end once
                    console.log(`Game ${gameId} ended. Score: P1 ${gameState.score.player1} - P2 ${gameState.score.player2}`);
                    gameInstance.status = 'ended';
                    if (gameInstance.engine.status !== 'ended') gameInstance.engine.endGame();

                    // Optionally, emit a final 'game_over' event if clients need explicit signal beyond score
                    // io.to(gameInstance.player1.socketId).emit('game_over', { gameId, finalState: gameState });
                    // io.to(gameInstance.player2.socketId).emit('game_over', { gameId, finalState: gameState });
                }
            }
        }

        // Cleanup ended games
        if (gameInstance.status === 'ended') {
            console.log(`Cleaning up ended game: ${gameId}`);
            // Update player statuses in onlineUsers
            const p1User = onlineUsers.get(gameInstance.player1.userId);
            if (p1User && p1User.status === 'in-game') {
                p1User.status = 'online';
                onlineUsers.set(gameInstance.player1.userId, p1User);
            }
            const p2User = onlineUsers.get(gameInstance.player2.userId);
            if (p2User && p2User.status === 'in-game') {
                p2User.status = 'online';
                onlineUsers.set(gameInstance.player2.userId, p2User);
            }
            
            activeGames.delete(gameId);
            io.emit('online_users_update', Array.from(onlineUsers.values())); // Update statuses for all
            console.log(`Game ${gameId} removed from active games. Remaining: ${activeGames.size}`);
        }
    });
}, 1000 / 60); // 60 times per second

// --- Middlewares ---
app.register(fastifyCors, { origin: true, credentials: true });
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
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
app.register(fastifyStatic, {
  root: avatarsDir,
  prefix: '/uploads/avatars/',
  decorateReply: false 
});


// Serve frontend static files (ensure this is AFTER API routes if prefix is '/')
app.register(fastifyStatic, {
  root: path.join(__dirname, '../frontend/dist'), 
  prefix: '/', 
});

//--------Routes------------
developerRoutes(app);
credentialsRoutes(app);
noHandlerRoute(app); // This should ideally be the last route registration for SPA fallback
//-------------------------

const PORT = 3000;
const HOST = '0.0.0.0';

const start = async () => {
    try {
        const address = await app.listen({ port: PORT, host: HOST });
        console.log("Server running " + address);
    } catch (e) {
        app.log.error(e);
        process.exit(1);
    }
}

start();
