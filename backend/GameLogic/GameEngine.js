/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameEngine.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:28:07 by beredzhe          #+#    #+#             */
/*   Updated: 2025/05/19 17:09:26 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// const GameState = require('./GameState.js').default.default.default; // Import GameState
import GameState from './GameState.js'

class GameEngine {
	constructor() {
		this.state = new GameState(); // Create a fresh game state (ball, paddles, scores)
	}

	update(dt) {
		this.state.updateBall(dt); // Move the ball based on its velocity and time passed
		this.state.checkCollisions(); // Check if ball hits paddles or walls
		this.state.updateScores(); // Check if someone scored a point
	}

	handlePlayerInput(playerId, direction) {
		// Let a player move their paddle up or down
		this.state.movePaddle(playerId, direction);
	}

	getState() {
		// Return the current game state to send to clients
		return this.state;
	}
}

export default GameEngine; // Export GameEngine