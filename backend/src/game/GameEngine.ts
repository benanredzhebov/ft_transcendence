/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameEngine.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/12 15:39:45 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/04/15 14:47:11 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/*Core game logic (positions, collisions, scoring)*/

import { GameState } from './GameState';

export class GameEngine {
	private	state: GameState;
  
	constructor() {
		this.state = new GameState(); // Create a fresh game state (ball, paddles, scores)
	}
  
	update(dt: number): void {
		this.state.updateBall(dt); // Move the ball based on its velocity and time passed
		this.state.checkCollisions(); // Check if ball hits paddles or walls
		this.state.updateScores(); // Check if someone scored a point
	}
  
	handlePlayerInput(playerId: string, direction: "up" | "down") {
		// Let a player move their paddle up or down
		this.state.movePaddle(playerId, direction);
	}
	
	getState(): GameState {
		// Return the current game state to send to clients
		return this.state;
	}
}