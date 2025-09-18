#!/usr/bin/env node

import { Server } from 'socket.io';
import { createServer } from 'http';
import GameManager from './GameLogic/GameManager.js';

// Create a simple HTTP server
const httpServer = createServer();

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize GameManager
const gameManager = new GameManager(io);

console.log('🎮 GameManager Test Server Starting...');
console.log('✅ GameManager initialized successfully');

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Simulate different game modes
  socket.on('test_local_match', () => {
    console.log(`🎯 Creating local match for ${socket.id}`);
    const { roomId, gameInstance } = gameManager.createLocalMatch(socket.id);
    socket.join(roomId);
    gameManager.joinRoom(socket.id, roomId);
    gameInstance.addPlayer(socket.id);
    
    console.log(`✅ Local match created: Room ${roomId}`);
    console.log(`👥 Players in room: ${Array.from(gameInstance.players)}`);
    
    // Test room broadcasting
    gameInstance.emitToRoom('test_message', { 
      message: 'Hello from room-isolated game!', 
      roomId: roomId,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('test_local_tournament', () => {
    console.log(`🏆 Creating local tournament for ${socket.id}`);
    const { roomId, gameInstance } = gameManager.createLocalTournament(socket.id);
    socket.join(roomId);
    gameManager.joinRoom(socket.id, roomId);
    gameInstance.addPlayer(socket.id);
    
    console.log(`✅ Local tournament created: Room ${roomId}`);
    console.log(`👥 Players in room: ${Array.from(gameInstance.players)}`);
    
    // Test room broadcasting
    gameInstance.emitToRoom('test_message', { 
      message: 'Hello from tournament room!', 
      roomId: roomId,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('test_player_move', ({ direction, playerId }) => {
    const socketRoomId = gameManager.getPlayerRoom(socket.id);
    if (socketRoomId) {
      const gameInstance = gameManager.getGameInstance(socketRoomId);
      console.log(`🎮 Player move in room ${socketRoomId}: ${direction}`);
      
      // Simulate game engine handling
      gameInstance.emitToRoom('move_processed', {
        playerId,
        direction,
        roomId: socketRoomId,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`❌ No room found for player ${socket.id}`);
    }
  });
  
  socket.on('get_room_info', () => {
    const socketRoomId = gameManager.getPlayerRoom(socket.id);
    if (socketRoomId) {
      const gameInstance = gameManager.getGameInstance(socketRoomId);
      socket.emit('room_info', {
        roomId: socketRoomId,
        gameType: gameInstance.type,
        players: Array.from(gameInstance.players),
        timestamp: new Date().toISOString()
      });
    } else {
      socket.emit('room_info', { error: 'Not in any room' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    const socketRoomId = gameManager.getPlayerRoom(socket.id);
    if (socketRoomId) {
      console.log(`🧹 Cleaning up room ${socketRoomId} for ${socket.id}`);
      gameManager.leaveRoom(socket.id, socketRoomId);
      gameManager.cleanupRoom(socketRoomId);
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 GameManager test server running on http://localhost:${PORT}`);
  console.log(`📝 Test by connecting to this server and sending:`);
  console.log(`   - 'test_local_match' to create a local match`);
  console.log(`   - 'test_local_tournament' to create a local tournament`);
  console.log(`   - 'test_player_move' with {direction: 'up', playerId: 'player1'}`);
  console.log(`   - 'get_room_info' to see current room status`);
  console.log(`🔧 Open multiple browser tabs to test socket isolation`);
});