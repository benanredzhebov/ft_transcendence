"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
/*Core game logic (positions, collisions, scoring)*/
const GameState_1 = require("./GameState");
class GameEngine {
    constructor() {
        this.state = new GameState_1.GameState(); // Create a fresh game state (ball, paddles, scores)
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
exports.GameEngine = GameEngine;
