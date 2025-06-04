/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameEngine.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:28:07 by beredzhe          #+#    #+#             */
/*   Updated: 2025/06/04 19:40:44 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import GameState from './GameState.js';

class GameEngine {
	constructor() {
		this.state = new GameState();
		this.connectedSockets = new Set();
		this.paused = false;
		this.lastUpdateTime = Date.now();
		this.isTournament = false;
	}

	// Player management
	addPlayer(socketId) {
	if (this.connectedSockets.size >= 2) return false;

	const success = this.state.addPlayer(socketId);
	if (success) {
		this.connectedSockets.add(socketId);
		console.log(`Player ${socketId} connected as ${this.state.getPlayerId(socketId)}`);
		// console.log('Connected players:', Array.from(this.state.connectedPlayers));
		// console.log('Connected sockets:', Array.from(this.connectedSockets));

		// Local match: ensure both players exist for one socket
		if (!this.isTournament) {
			if (!this.isTournament && this.state.connectedPlayers.size === 1) {
				this.state.addPlayer('local_player2');
				this.connectedSockets.add('local_player2');
				console.log('Local match: added player2 as local_player2');
				// console.log('Connected players:', Array.from(this.state.connectedPlayers));
				// console.log('Connected sockets:', Array.from(this.connectedSockets));
				}
			if (!this.isTournament && this.connectedSockets.size === 2) {
				this.startMatch();
				}
			}
		}
		return success;
	}

	removePlayer(socketId) {
		if (!this.connectedSockets.has(socketId)) return;

		this.connectedSockets.delete(socketId);
		this.state.removePlayer(socketId);
		console.log(`Player ${socketId} disconnected`);

		 // Local match: remove local_player2 if present
   		 if (!this.isTournament && this.connectedSockets.has('local_player2')) {
			this.connectedSockets.delete('local_player2');
			this.state.removePlayer('local_player2');
			console.log('Local match: removed player2 (local_player2)');
		}

		if (this.connectedSockets.size < 2) {
			this.resetGame();
		}
	}

	// Game loop
	update() {
		if (this.paused || this.state.gameOver) return;

		const now = Date.now();
		const dt = (now - this.lastUpdateTime) / 1000;
		this.lastUpdateTime = now;

		this.state.update(dt);
	}

	// Game control
	handlePlayerInput(id, direction) {
		console.log(`handlePlayerInput called with id=${id}, direction=${direction}, isTournament=${this.isTournament}`);
		if (this.paused || this.state.gameOver) return;

		if (id === 'player1' || id === 'player2') {
			this.state.movePaddle(id,direction);
		}
	}
	
	// setting the Tournament mode
	setTournamentMode(isTournament) {
		this.isTournament = isTournament;
	}

	pause() {
		this.paused = true;
		this.state.pause();
		console.log('Game paused');
	}

	resume() {
		this.paused = false;
		this.state.resume();
		this.lastUpdateTime = Date.now();
		console.log('Game resumed');
	}

	resetGame() {
		this.state.resetGame();
	}

	getState() {
		return this.state.getState();
	}

	// Tournament-specific
	prepareForMatch() {
		this.resetGame();
		this.pause();
	}

	startMatch() {
		this.resume();
	}
}

export default GameEngine;