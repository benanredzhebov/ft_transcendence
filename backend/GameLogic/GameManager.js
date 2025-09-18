/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameManager.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/17 18:00:00 by beredzhe          #+#    #+#             */
/*   Updated: 2025/09/18 19:30:11 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import GameEngine from './GameEngine.js';
import Tournament from './Tournament.js';
import LocalTournamentMode from './LocalTournamentMode.js';

/**
 * GameManager manages multiple game instances and rooms
 * Ensures proper isolation between different game sessions
 */
class GameManager {
	constructor(io) {
		this.io = io;
		this.localMatches = new Map(); // roomId -> LocalMatchInstance
		this.localTournaments = new Map(); // roomId -> LocalTournamentInstance  
		this.remoteTournaments = new Map(); // roomId -> RemoteTournamentInstance
		this.socketToRoom = new Map(); // socketId -> roomId
		this.roomToGameType = new Map(); // roomId -> gameType
	}

	/**
	 * Generate unique room ID for game sessions
	 */
	generateRoomId(gameType, socketId) {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `${gameType}_${socketId}_${timestamp}_${random}`;
	}

	/**
	 * Create and manage a local match game instance
	 */
	createLocalMatch(socketId, isAIMode = false) {
		const roomId = this.generateRoomId('local_match', socketId);
		const gameInstance = new LocalMatchInstance(roomId, this.io, isAIMode);
		
		this.localMatches.set(roomId, gameInstance);
		this.socketToRoom.set(socketId, roomId);
		this.roomToGameType.set(roomId, 'local_match');
		
		console.log(`Created local match room: ${roomId} for socket: ${socketId} (AI: ${isAIMode})`);
		return { roomId, gameInstance };
	}

	/**
	 * Create and manage a local tournament game instance
	 */
	createLocalTournament(socketId) {
		const roomId = this.generateRoomId('local_tournament', socketId);
		const gameInstance = new LocalTournamentInstance(roomId, this.io);
		
		this.localTournaments.set(roomId, gameInstance);
		this.socketToRoom.set(socketId, roomId);
		this.roomToGameType.set(roomId, 'local_tournament');
		
		console.log(`Created local tournament room: ${roomId} for socket: ${socketId}`);
		return { roomId, gameInstance };
	}

	/**
	 * Create and manage a remote tournament game instance
	 */
	createRemoteTournament() {
		const roomId = this.generateRoomId('remote_tournament', 'server');
		const gameInstance = new RemoteTournamentInstance(roomId, this.io);
		
		this.remoteTournaments.set(roomId, gameInstance);
		this.roomToGameType.set(roomId, 'remote_tournament');
		
		console.log(`Created remote tournament room: ${roomId}`);
		return { roomId, gameInstance };
	}

	/**
	 * Join a player to a specific room
	 */
	joinRoom(socketId, roomId) {
		const socket = this.io.sockets.sockets.get(socketId);
		if (socket) {
			socket.join(roomId);
			this.socketToRoom.set(socketId, roomId);
			console.log(`Socket ${socketId} joined room: ${roomId}`);
		}
	}

	/**
	 * Get game instance for a socket
	 */
	getGameInstance(socketId) {
		const roomId = this.socketToRoom.get(socketId);
		if (!roomId) return null;

		const gameType = this.roomToGameType.get(roomId);
		switch (gameType) {
			case 'local_match':
				return this.localMatches.get(roomId);
			case 'local_tournament':
				return this.localTournaments.get(roomId);
			case 'remote_tournament':
				return this.remoteTournaments.get(roomId);
			default:
				return null;
		}
	}

	/**
	 * Get room ID for a socket
	 */
	getRoomId(socketId) {
		return this.socketToRoom.get(socketId);
	}

	/**
	 * Clean up when a socket disconnects
	 */
	handleDisconnect(socketId) {
		const roomId = this.socketToRoom.get(socketId);
		if (!roomId) return;

		const gameInstance = this.getGameInstance(socketId);
		if (gameInstance) {
			gameInstance.handlePlayerDisconnect(socketId);
			
			// Clean up empty rooms
			if (gameInstance.isEmpty()) {
				this.cleanupRoom(roomId);
			}
		}

		this.socketToRoom.delete(socketId);
	}

	/**
	 * Clean up a room and its game instance
	 */
	cleanupRoom(roomId) {
		const gameType = this.roomToGameType.get(roomId);
		
		switch (gameType) {
			case 'local_match':
				this.localMatches.delete(roomId);
				break;
			case 'local_tournament':
				this.localTournaments.delete(roomId);
				break;
			case 'remote_tournament':
				this.remoteTournaments.delete(roomId);
				break;
		}
		
		this.roomToGameType.delete(roomId);
		console.log(`Cleaned up room: ${roomId}`);
	}

	/**
	 * Get all active rooms info
	 */
	getActiveRoomsInfo() {
		return {
			localMatches: this.localMatches.size,
			localTournaments: this.localTournaments.size,
			remoteTournaments: this.remoteTournaments.size,
			totalRooms: this.localMatches.size + this.localTournaments.size + this.remoteTournaments.size
		};
	}
}

/**
 * Local Match Game Instance
 * Manages isolated local match sessions
 */
class LocalMatchInstance {
	constructor(roomId, io, isAIMode = false) {
		this.roomId = roomId;
		this.io = io;
		this.type = 'local_match';
		this.isAIMode = isAIMode;
		this.gameEngine = new GameEngine();
		this.players = new Set();
		
		// Set the correct tournament mode (AI or local)
		const mode = isAIMode ? 'ai' : 'local';
		this.gameEngine.setTournamentMode(false, mode);
		console.log(`LocalMatchInstance created with mode: ${mode}, AI: ${isAIMode}`);
		
		this.gameLoop = null;
	}

	addPlayer(socketId) {
		if (this.players.size >= 1) return false; // Only one real player per local match
		
		this.players.add(socketId);
		const success = this.gameEngine.addPlayer(socketId);
		
		if (success) {
			console.log(`Local match ${this.roomId}: Player ${socketId} added`);
			
			// For local matches, we need to ensure both players exist
			// The GameEngine should handle adding local_player2 automatically
			// Let's force the game to be ready by ensuring proper state
			this.gameEngine.resetGame();
			this.gameEngine.resume();
			
			// Start the game update loop for this instance
			this.startGameLoop();
			
			// Debug: Check game state after starting
			const state = this.gameEngine.getState();
			console.log(`Local match ${this.roomId}: Game reset and started automatically`);
			console.log(`🎮 Debug - Game state: paused=${state.paused}, gameOver=${state.gameOver}, players=${state.connectedPlayers?.size || 'unknown'}`);
			console.log(`🎮 Debug - Ball state: x=${state.ball?.x}, y=${state.ball?.y}, vx=${state.ball?.vx}, vy=${state.ball?.vy}`);
		}
		
		return success;
	}

	removePlayer(socketId) {
		this.players.delete(socketId);
		this.gameEngine.removePlayer(socketId);
		console.log(`Local match ${this.roomId}: Player ${socketId} removed`);
	}

	handlePlayerDisconnect(socketId) {
		this.removePlayer(socketId);
		// Stop game loop when room becomes empty
		if (this.isEmpty()) {
			this.stopGameLoop();
		}
	}

	startGameLoop() {
		if (this.gameLoop) {
			clearInterval(this.gameLoop);
		}
		
		this.gameLoop = setInterval(() => {
			if (!this.gameEngine.state.paused && !this.gameEngine.state.gameOver) {
				this.gameEngine.update();
				this.emitToRoom('state_update', this.gameEngine.getState());
			}
		}, 16); // ~60 FPS
		
		console.log(`🔄 Game loop started for room ${this.roomId}`);
	}

	stopGameLoop() {
		if (this.gameLoop) {
			clearInterval(this.gameLoop);
			this.gameLoop = null;
			console.log(`⏹️ Game loop stopped for room ${this.roomId}`);
		}
	}

	isEmpty() {
		return this.players.size === 0;
	}

	emitToRoom(event, data) {
		this.io.to(this.roomId).emit(event, data);
	}

	handlePlayerMove(direction, playerId) {
		this.gameEngine.handlePlayerInput(playerId, direction);
		this.emitToRoom('state_update', this.gameEngine.getState());
	}

	handlePause() {
		this.gameEngine.pauseGame();
		this.emitToRoom('game_paused');
	}

	handleResume() {
		this.gameEngine.resumeGame();
		this.emitToRoom('game_resumed');
	}

	handleRestart() {
		this.gameEngine.resetGame();
		this.emitToRoom('state_update', this.gameEngine.getState());
	}
}

/**
 * Local Tournament Game Instance
 * Manages isolated local tournament sessions
 */
class LocalTournamentInstance {
	constructor(roomId, io) {
		this.roomId = roomId;
		this.io = io;
		this.type = 'local_tournament';
		this.localTournament = new LocalTournamentMode();
		this.players = new Set();
		this.isActive = false;
		this.tournamentMode = this.localTournament; // Alias for compatibility
	}

	// Get gameEngine from the tournament mode
	get gameEngine() {
		return this.localTournament.gameEngine;
	}

	addPlayer(socketId) {
		this.players.add(socketId);
		console.log(`Local tournament ${this.roomId}: Player ${socketId} added`);
		
		// Don't automatically initialize tournament - wait for startTournament() call
		// This allows frontend to show player setup dialog first
	}

	initializeTournament(socketId) {
		// This method is now called from startTournament, not from addPlayer
		try {
			// Set the socket ID for the tournament
			this.localTournament.socketId = socketId;
			console.log(`Initializing local tournament setup in room ${this.roomId}`);
			return true;
		} catch (error) {
			console.error(`Failed to initialize tournament in room ${this.roomId}:`, error);
		}
	}

	startTournament(socketId, playerNames) {
		try {
			if (!playerNames || playerNames.length < 2) {
				throw new Error("At least 2 players are required for a local tournament");
			}

			console.log(`Starting local tournament in room ${this.roomId} with players:`, playerNames);
			
			// Initialize the tournament infrastructure first
			this.initializeTournament(socketId);
			
			// Initialize the tournament with the provided player names
			const status = this.localTournament.initializeTournament(socketId, playerNames);
			
			// Generate the tournament bracket but don't start the first match yet
			const currentMatch = this.localTournament.generateInitialBracket();
			console.log(`Generated bracket, current match:`, currentMatch);
			
			// Don't start the match automatically - wait for start_local_tournament_match
			// const matchResult = this.localTournament.startCurrentMatch();
			// console.log(`Started first match:`, matchResult);
			
			// Don't start the game loop yet - wait for match to start
			// this.startGameLoop();
			
			// The tournament is now ready but not active yet
			this.isActive = false; // Set to true when match actually starts
			
			// Send the data in the format the frontend expects
			const tournamentStatus = {
				currentMatch: {
					player1: { id: currentMatch[0][0], name: currentMatch[0][1].name },
					player2: currentMatch[1] ? { id: currentMatch[1][0], name: currentMatch[1][1].name } : null
				},
				bracket: this.localTournament.rounds,
				tournamentActive: false // Not active until match starts
			};
			
			this.emitToRoom('local_tournament_initialized', tournamentStatus);
			return status;
		} catch (error) {
			console.error(`Failed to start tournament in room ${this.roomId}:`, error);
			this.emitToRoom('local_tournament_error', { error: error.message });
		}
	}

	startCurrentMatch() {
		try {
			if (!this.localTournament.currentMatch) {
				throw new Error('No current match to start');
			}

			console.log(`Starting current match in room ${this.roomId}`);
			
			// Start the current match
			const matchResult = this.localTournament.startCurrentMatch();
			console.log(`Started match:`, matchResult);
			
			// Start the game loop for the match
			this.startGameLoop();
			
			// The tournament is now active
			this.isActive = true;
			
			return matchResult;
		} catch (error) {
			console.error(`Failed to start current match in room ${this.roomId}:`, error);
			throw error;
		}
	}

	removePlayer(socketId) {
		this.players.delete(socketId);
		console.log(`Local tournament ${this.roomId}: Player ${socketId} removed`);
	}

	handlePlayerDisconnect(socketId) {
		this.removePlayer(socketId);
		if (this.isActive) {
			this.stopGameLoop();
			this.localTournament.reset();
			this.emitToRoom('local_tournament_reset', { reason: 'Player disconnected' });
		}
	}

	isEmpty() {
		return this.players.size === 0;
	}

	emitToRoom(event, data) {
		this.io.to(this.roomId).emit(event, data);
	}

	handlePlayerMove(direction, playerId) {
		const input = { playerId, direction };
		const result = this.localTournament.handleGameInput(input);
		if (result) {
			this.emitToRoom('state_update', this.localTournament.getGameState());
		}
	}

	handlePause() {
		if (this.localTournament.gameEngine) {
			this.localTournament.gameEngine.pause();
		}
		this.emitToRoom('local_tournament_paused');
	}

	handleResume() {
		if (this.localTournament.gameEngine) {
			this.localTournament.gameEngine.resume();
		}
		this.emitToRoom('local_tournament_resumed');
	}

	startGameLoop() {
		if (this.gameLoop) {
			clearInterval(this.gameLoop);
		}
		
		this.gameLoop = setInterval(() => {
			if (this.localTournament.gameEngine && 
				!this.localTournament.gameEngine.state.paused && 
				!this.localTournament.gameEngine.state.gameOver) {
				this.localTournament.gameEngine.update();
				this.emitToRoom('state_update', this.localTournament.getGameState());
			}
		}, 16); // ~60 FPS
		
		console.log(`🔄 Tournament game loop started for room ${this.roomId}`);
	}

	stopGameLoop() {
		if (this.gameLoop) {
			clearInterval(this.gameLoop);
			this.gameLoop = null;
			console.log(`⏹️ Tournament game loop stopped for room ${this.roomId}`);
		}
	}
}

/**
 * Remote Tournament Game Instance
 * Manages isolated remote tournament sessions
 */
class RemoteTournamentInstance {
	constructor(roomId, io) {
		this.roomId = roomId;
		this.io = io;
		this.tournament = new Tournament();
		this.players = new Map(); // socketId -> playerData
		this.isActive = false;
	}

	addPlayer(socketId, playerData) {
		this.players.set(socketId, playerData);
		console.log(`Remote tournament ${this.roomId}: Player ${socketId} added`);
	}

	removePlayer(socketId) {
		this.players.delete(socketId);
		console.log(`Remote tournament ${this.roomId}: Player ${socketId} removed`);
	}

	handlePlayerDisconnect(socketId) {
		if (this.players.has(socketId)) {
			const playerData = this.players.get(socketId);
			this.tournament.handlePlayerDisconnect(socketId, playerData);
			this.removePlayer(socketId);
		}
	}

	isEmpty() {
		return this.players.size === 0;
	}

	emitToRoom(event, data) {
		this.io.to(this.roomId).emit(event, data);
	}

	joinTournament(socketId, alias) {
		const result = this.tournament.addPlayer(socketId, alias);
		if (result.success) {
			this.addPlayer(socketId, { alias });
			this.emitToRoom('tournament_joined', result);
		}
		return result;
	}
}

export default GameManager;