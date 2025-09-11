# 🏓 Transcendence Game Modes Documentation

## Overview

The Transcendence Pong game features four distinct game modes, each designed to provide different gaming experiences. This document explains each mode in detail, including their architecture, features, and implementation specifics.

## 🎮 Game Modes Summary

| Mode                  | Players            | Description                             | Use Case                           |
| --------------------- | ------------------ | --------------------------------------- | ---------------------------------- |
| **Local Match**       | 2 local players    | Single device multiplayer               | Quick games, local competition     |
| **AI Mode**           | 1 human vs AI      | Player vs computer opponent             | Practice, single-player experience |
| **Local Tournament**  | 2-8 local players  | Single device tournament bracket        | Local competitions, parties        |
| **Remote Tournament** | 2-8 remote players | Online tournament with multiple players | Competitive online play            |

---

## 1. 🏠 Local Match Mode

### Description

A traditional local multiplayer Pong game where two players share the same device.

### Features

- **Real-time gameplay** with 60 FPS rendering
- **Dual control scheme**: Player 1 (W/S keys), Player 2 (Arrow keys)
- **Pause/Resume functionality** using P or Space
- **Immediate restart** capability
- **Score tracking** up to 5 points to win

### Technical Implementation

#### Frontend (game.ts)

```typescript
// URL: /game (no parameters)
const isLocalMatch = !tournamentMode && !aiMode && !localTournamentMode;

// Socket connection with local mode
socket = io(backendUrl, {
  query: {
    token: localStorage.getItem("jwtToken"),
    local: "true",
    mode: "local",
  },
});
```

#### Backend (server.js)

```javascript
// Detected as local match
const isLocalMatch = socket.handshake.query.local === "true";
const gameMode = socket.handshake.query.mode || "local";

// Game engine setup
if (isLocalMatch) {
  if (!game.addPlayer(socket.id)) {
    socket.emit("error", { message: "Game is full" });
    socket.disconnect();
    return;
  }
}

// Real-time game loop (60 FPS)
setInterval(() => {
  if (game.state.connectedPlayers.size > 0) {
    const stateUpdate = game.update();
    io.emit("state_update", stateUpdate);
  }
}, 16);
```

#### Game Controls

- **Player 1**: W (up) / S (down)
- **Player 2**: ↑ (up) / ↓ (down)
- **Pause**: P or Space (either player)

#### Game Flow

1. Player navigates to `/game`
2. Socket connects with `local: true, mode: 'local'`
3. Game starts immediately with both paddles active
4. Real-time input handling and state updates
5. First to 5 points wins
6. Game over screen with restart options

---

## 2. 🤖 AI Mode

### Description

Single-player mode where a human player competes against an intelligent computer opponent.

### Features

- **Smart AI opponent** with predictive ball tracking
- **Difficulty-based behavior** with configurable error margins
- **Real-time AI decision making** with reaction delays
- **Same controls** as local mode for human player
- **AI paddle automation** for Player 2

### Technical Implementation

#### AI Algorithm (AIOpponent.js)

```javascript
class AIOpponent {
  constructor(gameEngine, difficulty = "easy") {
    this.gameEngine = gameEngine;
    this.difficulty = difficulty;
    this.targetY = this.gameEngine.state.height / 2;
    this.updateInterval = 1000; // AI thinks once per second
    this.reactionTime = 100; // ms reaction delay
    this.errorMargin = 50; // prediction error
  }

  predictBallLandingY() {
    // Predicts where ball will be when it reaches AI paddle
    // Includes wall bounce calculations
    // Adds difficulty-based inaccuracy
  }

  update() {
    // Updates AI target position periodically
    // Moves paddle towards target with smooth movement
  }
}
```

#### Frontend Integration

```typescript
// URL: /game?mode=ai
const aiMode = urlParams.get("mode") === "ai";

// Socket connection
socket = io(backendUrl, {
  query: {
    token: localStorage.getItem("jwtToken"),
    local: "false",
    mode: "ai",
  },
});

// Only Player 1 controls active
if (pressedKeys.has("w"))
  socket.emit("player_move", { playerId: "player1", direction: "up" });
if (pressedKeys.has("s"))
  socket.emit("player_move", { playerId: "player1", direction: "down" });
```

#### Backend Setup

```javascript
const isAIMode = gameMode === "ai";

// Initialize AI when mode is detected
game.setTournamentMode(isTournamentMode, gameMode);
if (gameMode === "ai") {
  this.aiOpponent = new AIOpponent(this);
  console.log("AI Opponent initialized");
}

// AI update in game loop
if (this.aiOpponent) {
  this.aiOpponent.update();
}
```

#### Game Flow

1. Player navigates to `/game?mode=ai`
2. Socket connects with `mode: 'ai'`
3. AI opponent initializes
4. Game starts with Player 1 vs AI
5. AI continuously calculates optimal paddle position
6. Human player controls left paddle, AI controls right paddle

---

## 3. 🏠🏆 Local Tournament Mode

### Description

A tournament bracket system for 2-8 players on a single device, with automatic bracket generation and match progression.

### Features

- **2-8 player support** with automatic bracket generation
- **Bye handling** for odd player counts
- **Round-by-round progression** with automatic advancement
- **Real-time bracket visualization**
- **Match history tracking**
- **Single elimination format**

### Technical Implementation

#### Local Tournament Class (LocalTournamentMode.js)

```javascript
class LocalTournamentMode {
  constructor() {
    this.players = new Map(); // playerId -> { name, isReady }
    this.rounds = []; // Array of rounds
    this.currentRound = 0;
    this.currentMatchIndex = 0;
    this.currentMatch = null;
    this.winners = [];
    this.allMatches = [];
    this.isFinished = false;
    this.tournamentWinner = null;
    this.gameEngine = null; // Current game engine for matches
    this.socketId = null; // Single socket for local tournament
  }
}
```

#### Bracket Generation Algorithm

```javascript
generateInitialBracket() {
    const players = Array.from(this.players.entries());
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    const firstRound = [];
    while (shuffled.length >= 2) {
        firstRound.push([shuffled.pop(), shuffled.pop()]);
    }

    // Handle odd player count with bye
    if (shuffled.length === 1) {
        const byePlayer = shuffled.pop();
        if (byePlayer) {
            firstRound.push([byePlayer, null]); // null represents bye
        }
    }

    this.rounds = [firstRound];
    this.currentRound = 0;
    this.currentMatchIndex = 0;
    this.currentMatch = firstRound[0];
}
```

#### Frontend Flow

```typescript
// URL: /game?tournament=local
const localTournamentMode = urlParams.get("tournament") === "local";

// Tournament setup dialog
function promptLocalTournamentSetup() {
  // UI for entering 2-8 player names
  // Validation for unique names
  // Tournament initialization
}

// Match progression
socket.on("local_tournament_match_started", (matchInfo) => {
  // Start match between two players
  // Display current match info
  // Enable controls for both players
});
```

#### Game Flow

1. Player navigates to `/game?tournament=local`
2. Tournament setup dialog appears
3. Player enters 2-8 unique names
4. Bracket is generated automatically
5. First match starts with both players using keyboard
6. Winner advances, bracket updates
7. Tournament continues until champion is determined

#### Controls in Local Tournament

- **Player 1**: W (up) / S (down)
- **Player 2**: ↑ (up) / ↓ (down)
- **Pause**: P or Space during matches
- **Match progression**: Automatic after each game

---

## 4. 🌐🏆 Remote Tournament Mode

### Description

An online tournament system where multiple players from different devices compete in a structured bracket format.

### Features

- **Online multiplayer** with real-time synchronization
- **Player authentication** and alias registration
- **Synchronized countdown** for match starts
- **Automatic bracket management** with live updates
- **Forfeit handling** for disconnected players
- **Tournament lobby** with ready system
- **Match assignment** and spectator support

### Technical Implementation

#### Tournament Class (Tournament.js)

```javascript
class Tournament {
  constructor() {
    this.players = new Map(); // socketId -> { alias, isReady, userId, username }
    this.rounds = []; // Array of rounds
    this.currentRound = 0;
    this.currentMatchIndex = 0;
    this.currentMatch = null;
    this.winners = [];
    this.byes = new Set(); // Track players who got byes
    this.allMatches = [];
    this.isFinished = false;
    this.tournamentWinner = null;
  }
}
```

#### Player Registration System

```javascript
socket.on("register_alias", ({ alias, token }) => {
  // JWT token verification
  const decodedToken = jwt.verify(token, JWT_SECRET);
  const user = { userId: decodedToken.userId, username: decodedToken.username };

  // Tournament registration
  if (!tournament) tournament = new Tournament();
  const success = tournament.registerPlayer(socket.id, alias, user);

  if (success) {
    // Update lobby
    io.emit("tournament_lobby", {
      message: tournament.canStartTournament()
        ? "Ready to start tournament?"
        : "Waiting for more players...",
      players: Array.from(tournament.players.values()).map((p) => p.alias),
    });
  }
});
```

#### Match Synchronization

```javascript
function startSynchronizedCountdown(io, duration = 5) {
  let remaining = duration;

  countdownInterval = setInterval(() => {
    io.emit("countdown_update", remaining);
    remaining--;

    if (remaining < 0) {
      clearInterval(countdownInterval);
      setTimeout(() => {
        game.startMatch();
        game.paused = false;
        io.emit("start_match");
        io.emit("state_update", game.getState());
      }, 1000);
    }
  }, 1000);
}
```

#### Player Assignment System

```javascript
socket.on("assign_controls", (playerId) => {
  assignedPlayerId = playerId; // 'player1' or 'player2'

  // Only assigned player can control their paddle
  if (assignedPlayerId === "player1") {
    if (pressedKeys.has("w"))
      socket.emit("player_move", { playerId: "player1", direction: "up" });
    if (pressedKeys.has("s"))
      socket.emit("player_move", { playerId: "player1", direction: "down" });
  }
});
```

#### Frontend Tournament Flow

```typescript
// Tournament registration
function promptAliasRegistration() {
  const alias = prompt("Enter your tournament alias:");
  if (alias) {
    const token = sessionStorage.getItem("authToken");
    socket?.emit("register_alias", { alias, token });
  }
}

// Ready system
socket.on("await_player_ready", () => {
  showTournamentDialog("Match ready!", {
    confirmText: "I'm Ready",
  });
});

// Tournament bracket display
socket.on("tournament_bracket", (data) => {
  // Real-time bracket visualization
  // Current match highlighting
  // Match results display
});
```

#### Game Flow

1. Player navigates to `/game?tournament=true`
2. Alias registration dialog appears
3. Player enters unique tournament alias
4. Tournament lobby shows waiting players
5. Host starts tournament when ready
6. Bracket is generated and displayed
7. Players are assigned to matches
8. Synchronized countdown for each match
9. Only assigned players can control paddles
10. Winners advance automatically
11. Tournament continues until champion

#### Controls in Remote Tournament

- **Assigned Player 1**: W (up) / S (down)
- **Assigned Player 2**: ↑ (up) / ↓ (down)
- **Pause**: P or Space (tournament-specific pause system)
- **Ready**: "I'm Ready" button between matches

---

## 🎯 Key Technical Features

### Socket.IO Architecture

Each game mode uses different socket query parameters to determine behavior:

```javascript
// Local Match
{ local: 'true', mode: 'local' }

// AI Mode
{ local: 'false', mode: 'ai' }

// Local Tournament
{ local: 'false', mode: 'local_tournament' }

// Remote Tournament
{ local: 'false', mode: 'tournament' }
```

### Game State Management

- **Real-time synchronization** at 60 FPS
- **Pause/Resume functionality** across all modes
- **State persistence** for tournament progression
- **Error handling** for disconnections and timeouts

### Responsive Design

- **Dynamic canvas sizing** based on container
- **Aspect ratio preservation** (900x600 game area)
- **Cross-device compatibility** for tournaments
- **Mobile-friendly controls** consideration

### Security Features

- **JWT authentication** for remote tournaments
- **Input validation** for player names and aliases
- **Rate limiting** for socket events
- **Secure tournament state management**

---

## 🚀 Getting Started

### Quick Start for Each Mode

#### Local Match

```bash
# Navigate to game
/game
# Game starts immediately with both players
```

#### AI Mode

```bash
# Navigate to AI game
/game?mode=ai
# Play against computer opponent
```

#### Local Tournament

```bash
# Navigate to local tournament
/game?tournament=local
# Enter 2-8 player names and start tournament
```

#### Remote Tournament

```bash
# Navigate to remote tournament
/game?tournament=true
# Register alias and wait for other players
```

### Development Setup

```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm run dev
```

## 📊 Performance Metrics

### Real-time Performance

- **60 FPS** game loop for smooth gameplay
- **16ms** update intervals for state synchronization
- **<100ms** latency for online tournaments
- **WebSocket** connections for minimal overhead

### Scalability

- **Up to 8 players** per tournament
- **Multiple concurrent** tournaments supported
- **Memory efficient** bracket management
- **Graceful degradation** for network issues

---

## 🔧 Customization Options

### AI Difficulty Levels

```javascript
// Easy AI
{ updateInterval: 1000, reactionTime: 200, errorMargin: 80 }

// Medium AI
{ updateInterval: 800, reactionTime: 150, errorMargin: 50 }

// Hard AI
{ updateInterval: 500, reactionTime: 100, errorMargin: 20 }
```

### Tournament Formats

- **Single Elimination** (current implementation)
- **Double Elimination** (future enhancement)
- **Round Robin** (future enhancement)
- **Swiss System** (future enhancement)

### Game Physics

- **Ball speed**: Configurable acceleration
- **Paddle size**: Adjustable height/width
- **Court dimensions**: Scalable game area
- **Scoring system**: Customizable win conditions

This comprehensive game mode system provides a complete Pong experience suitable for casual local play, competitive practice, and organized tournaments both locally and online.


-----------------------------------------------------------------

// 1. IMPORTS & CONFIGURATION (Lines 1-35)
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

// 2. DEPENDENCIES (Lines 15-30)
import fastify from 'fastify';
import { Server } from 'socket.io';
import GameEngine from './GameLogic/GameEngine.js';
// ... other imports

// 3. GLOBAL VARIABLES (Lines 35-75)
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const PORT = process.env.PORT || 8443;
const HOST = '0.0.0.0';

// 4. SSL CERTIFICATE SETUP (Lines 60-75)
const httpsOptions = {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
};

// 5. FASTIFY APP CREATION (Lines 75-85)
const app = fastify({
    logger: false,
    https: httpsOptions,
});

// 6. SOCKET.IO SERVER CREATION (Lines 85-90)
const io = new Server(server, {
    cors: { origin: '*' },
});

// 7. GAME LOGIC INITIALIZATION (Lines 90-110)
let tournament = null;
let localTournament = null;
const game = new GameEngine();
const onlineUsers = new Map();

// 8. SERVER INITIALIZATION (Lines 95-110)
function initializeServer() {
    // Reset tournament states
    // Reset game state
    console.log('Server initialized - all states reset');
}
initializeServer(); // ← Called immediately

// 9. GAME LOOPS START (Lines 110-150)
// Local Tournament Game Loop (60 FPS)
setInterval(() => {
    if (localTournament && localTournament.gameEngine) {
        const updatedState = localTournament.updateGame();
        if (updatedState && localTournament.socketId) {
            io.to(localTournament.socketId).emit('state_update', updatedState);
        }
    }
}, 16);

// 10. SOCKET EVENT HANDLERS (Lines 150-1100)
io.on('connection', (socket) => {
    // All socket event handlers defined here
});

// 11. MAIN GAME LOOP (Lines 1120-1140)
setInterval(() => {
    // 60 FPS main game loop for regular matches
    if (shouldRunGameLoop) {
        game.update(1 / 60);
        io.emit('state_update', game.getState());
    }
}, 1000 / 60);

// 12. MIDDLEWARE REGISTRATION (Lines 1140-1170)
app.register(fastifyCors, { origin: true, credentials: true });
app.register(multipart, { limits: { fileSize: 7 * 1024 * 1024 } });
app.register(fastifyStatic, { root: avatarsDir, prefix: '/uploads/avatars/' });

// 13. ROUTES REGISTRATION (Lines 1170-1180)
developerRoutes(app);
credentialsRoutes(app);

// 14. SPA FALLBACK (Lines 1180-1185)
app.setNotFoundHandler((req, reply) => {
    reply.sendFile('index.html');
});

// 15. MAIN FUNCTION EXECUTION (Lines 1185-1205)
const start = async () => {
    try{
        const address = await app.listen({ port: PORT, host: HOST });
        console.log("Server running " + address)
        console.log(`Access to school ${process.env.APP_URL}`)
    }
    catch (e){
        console.error('❌ Error in start function:', e);
        process.exit(1);
    }
}

start(); // ← MAIN EXECUTION STARTS HERE