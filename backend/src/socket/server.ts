/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/12 15:44:20 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/04/15 17:35:13 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/* WebSocket server logic (room management, events) */

const fs = require('fs');
const https = require('https');
const { Server, Socket } = require('socket.io'); // Use require and destructure Socket here
const { GameEngine } = require('../game/GameEngine');

//SSL certificate
const key = fs.readFileSync('./ssl/key.pem');
const cert = fs.readFileSync('./ssl/cert.pem');

const httpsServer = https.createServer({ key, cert });
const io = new Server(httpsServer, {
  cors: { origin: '*' }
});

const game = new GameEngine();

interface PlayerMovePayload {
  playerId: string;
  direction: 'up' | 'down';
}

io.on('connection', (socket: typeof Socket) => {
  console.log('Secure player connected:', socket.id);

  socket.on('player_move', ({ playerId, direction }: PlayerMovePayload) => { 
    game.handlePlayerInput(playerId, direction);
  });
});

setInterval(() => {
  game.update(0.016);
  const state = game.getState();
  io.emit('state_update', state);
}, 16);

httpsServer.listen(3000, () => {
  console.log('✅ Secure WebSocket server running at https://localhost:3000');
});