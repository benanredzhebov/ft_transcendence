/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameEngine.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:28:07 by beredzhe          #+#    #+#             */
/*   Updated: 2025/05/25 22:28:32 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// const GameState = require('./GameState.js').default.default.default; // Import GameState
import GameState from './GameState.js'

class GameEngine {
	constructor() {
		this.state = new GameState(); // Create a fresh game state (ball, paddles, scores)
		this.players = new Map(); // Store players by sockedId
		this.paused = false; // avoiding immediate end the tournament
	}

	update(dt) {
		if (this.paused || this.state.gameOver) return ; // Pause logic
		this.state.updateBall(dt); // Move the ball based on its velocity and time passed
		this.state.checkCollisions(); // Check if ball hits paddles or walls
		this.state.updateScores(); // Check if someone scored a point
	}

	pause() {
		this.paused = true;
	}

	resume() {
		this.paused = false;
	}

	handlePlayerInput(playerId, direction) {
		// Let a player move their paddle up or down
		this.state.movePaddle(playerId, direction);
	}

	getState() {
		// Return the current game state to send to clients
		return this.state;
	}

	resetGame() {
		console.log('[GameEngine] Resetting game state.');
		this.state.resetGame();
	}
	
	removePlayer(socketId) {
		if (this.players.has(socketId)) {
			this.players.delete(socketId);
			console.log(`Player with socket ${socketId} removed from GameEngine.`);
		} else {
			console.log(`No tracked player found for socket ${socketId}.`);
		}
	}
}

export default GameEngine; // Export GameEngine