/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameEngine.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:28:07 by beredzhe          #+#    #+#             */
/*   Updated: 2025/05/27 21:43:40 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// const GameState = require('./GameState.js').default.default.default; // Import GameState
import GameState from './GameState.js';

class GameEngine {
  constructor() {
    this.state = new GameState();
    this.connectedSockets = new Set();
    this.paused = false;
    this.lastUpdateTime = Date.now();
  }

  // Player management
  addPlayer(socketId) {
    if (this.connectedSockets.size >= 2) return false;

    const success = this.state.addPlayer(socketId);
    if (success) {
      this.connectedSockets.add(socketId);
      console.log(`Player ${socketId} connected as ${this.state.getPlayerId(socketId)}`);
    }
    return success;
  }

  removePlayer(socketId) {
    if (!this.connectedSockets.has(socketId)) return;

    this.connectedSockets.delete(socketId);
    this.state.removePlayer(socketId);
    console.log(`Player ${socketId} disconnected`);

    if (this.connectedSockets.size < 2) {
      this.pause();
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
  handlePlayerInput(socketId, direction) {
    const playerId = this.state.getPlayerId(socketId);
    if (playerId && !this.paused && !this.state.gameOver) {
      this.state.movePaddle(playerId, direction);
    }
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
    console.log('Game reset');
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