/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/12 15:44:20 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/04/17 09:23:35 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/* Set up WebSocket server logic using Node.js, the socket.io library,
and HTTPS (room management, events) */

import fs from 'fs'; // this module used to read SSL certificate files
import https from 'https'; // this module creates secure HTTPS module
import { Server } from 'socket.io'; // Provides WebSocket functionality for real time communication between the server and clients
import { GameEngine } from '../game/GameEngine'; // Custom module that handles game logic

// Load SSL certificate. These files are required to enable HTTPS
const key = fs.readFileSync('./ssl/key.pem');
const cert = fs.readFileSync('./ssl/cert.pem');

// Creates an HTTPS server using loaded SSl key and certificate
const httpsServer = https.createServer({ key, cert });
const io = new Server(httpsServer, {
  cors: { origin: '*' } // CORS (Cross-Origin Resource Sharing) is configured to allow requests from any origin ('*')
});

// Creates an instance of the GameEngine class, which manages the game's logic and state
const game = new GameEngine();

// Listens for new client connection
io.on('connection', (socket) => {
  console.log('Secure player connected:', socket.id);

  socket.on('player_move', ({ playerId, direction }) => {
    game.handlePlayerInput(playerId, direction);
  });
});

// Game loop. Runs every 16 milliseconds(approximately 60 frames per second)
setInterval(() => {
  game.update(0.016);
  const state = game.getState();
  io.emit('state_update', state); // Broadcasts the updated game state to all connected clients.
}, 16);

httpsServer.listen(3000, () => {
  console.log('✅ Secure WebSocket server running at https://localhost:3000');
});