/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameState.js                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:27:35 by beredzhe          #+#    #+#             */
/*   Updated: 2025/05/06 14:50:27 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class GameState {
	constructor() {
		this.width = 900; // Game width
		this.height = 600; // Game height
		this.paddleSpeed = 30;

		// Stores the positions and dimensions of the two paddles
		this.paddles = {
			player1: { y: 250, height: 100, width: 10 },
			player2: { y: 250, height: 100, width: 10 },
		};

		// Stores the position, velocity, and size of the ball
		this.ball = {
			x: this.width / 2, // Ball starts at the horizontal center of the screen
			y: this.height / 2, // Ball starts at the vertical center of the screen
			vx: 5, // Horizontal speed of the ball
			vy: 3, // Vertical speed of the ball
			radius: 10,
		};

		this.score = {
			player1: 0,
			player2: 0,
		};
	}

	// Updates the ball's position based on its velocity and the time delta
	updateBall(dt) {
		this.ball.x += this.ball.vx * dt * 60; // Scale velocity by frame time
		this.ball.y += this.ball.vy * dt * 60;

		// Top or bottom wall collision
		if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > this.height) {
			this.ball.vy *= -1; // Reverse Y direction (if collision occurs)
		}

		// Left and right wall — scoring
		if (this.ball.x - this.ball.radius < 0) {
			this.score.player2++;
			this.resetBall();
		}

		if (this.ball.x + this.ball.radius > this.width) {
			this.score.player1++;
			this.resetBall();
		}
	}

	// Moves a paddle up or down based on the player's input
	movePaddle(playerId, direction) {
		const paddle = this.paddles[playerId]; // Get the paddle
		if (!paddle) return;

		const moveBy = this.paddleSpeed; // Determine movement distance
		if (direction === 'up') {
			paddle.y = Math.max(0, paddle.y - moveBy); // Move up
		} else if (direction === 'down') {
			paddle.y = Math.min(this.height - paddle.height, paddle.y + moveBy); // Move down
		} else {
			console.warn(`Invalid direction: ${direction}`); // Handle invalid input
		}
	}

	// Checks if the ball collides with either paddle
	checkCollisions() {
		const ball = this.ball;
		const paddle1 = this.paddles.player1;
		const paddle2 = this.paddles.player2;

		// Paddle1 collision (left)
		if (
			ball.x - ball.radius <= paddle1.width &&
			ball.y >= paddle1.y &&
			ball.y <= paddle1.y + paddle1.height
		) {
			ball.vx *= -1;
			ball.x = paddle1.width + ball.radius; // Prevent sticking
		}

		// Paddle2 collision (right)
		if (
			ball.x + ball.radius >= this.width - paddle2.width &&
			ball.y >= paddle2.y &&
			ball.y <= paddle2.y + paddle2.height
		) {
			ball.vx *= -1;
			ball.x = this.width - paddle2.width - ball.radius; // Prevent sticking
		}
	}

	updateScores() {
		// (optional) add sound effects or UI update logic hooks here
	}

	// Resets the ball to the center of the game area
	resetBall() {
		this.ball.x = this.width / 2;
		this.ball.y = this.height / 2;
		this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 2); // Randomize speed slightly
		this.ball.vy = 3 * (Math.random() > 0.5 ? 1 : -1); // Randomize up/down
	}

	// Resets the entire game state (e.g., for restarting the game)
	resetGame() {
		this.score = { player1: 0, player2: 0 };
		this.paddles.player1.y = 250;
		this.paddles.player2.y = 250;
		this.resetBall();
	}

	// Returns the current game state (useful for sending to clients)
	getState() {
		return {
			width: this.width,
			height: this.height,
			paddles: this.paddles,
			ball: this.ball,
			score: this.score,
		};
	}
}

export default GameState; // Export GameState