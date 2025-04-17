"use strict";
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

// Load SSL certificate
const key = fs.readFileSync('./ssl/key.pem');
const cert = fs.readFileSync('./ssl/cert.pem');
const httpsServer = https.createServer({ key, cert });
const io = new Server(httpsServer, {
    cors: { origin: '*' }
});
const game = new GameEngine();
io.on('connection', (socket) => {
    console.log('Secure player connected:', socket.id);
    socket.on('player_move', ({ playerId, direction }) => {
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
