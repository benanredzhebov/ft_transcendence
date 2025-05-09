/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameState.js                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:27:35 by beredzhe          #+#    #+#             */
/*   Updated: 2025/05/09 11:01:59 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class GameState {
	constructor() {
		this.width = 900;
		this.height = 600;
		this.paddleSpeed = 30;

		this.paddles = {
			player1: { y: 250, height: 100, width: 10 },
			player2: { y: 250, height: 100, width: 10 },
		};

		this.ball = {
			x: this.width / 2,
			y: this.height / 2,
			vx: 5,
			vy: 3,
			radius: 10,
		};

		this.score = {
			player1: 0,
			player2: 0,
		};

		this.gameOver = false; // ✅ NEW: flag to track game state
	}

	updateBall(dt) {
		if (this.gameOver) return; // ✅ Stop ball movement if game is over

		this.ball.x += this.ball.vx * dt * 60;
		this.ball.y += this.ball.vy * dt * 60;

		if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > this.height) {
			this.ball.vy *= -1;
		}

		// Left wall: player2 scores
		if (this.ball.x - this.ball.radius < 0) {
			this.score.player2++;
			if (this.score.player2 >= 5) {
				this.gameOver = true;
				return;
			}
			this.resetBall();
		}

		// Right wall: player1 scores
		if (this.ball.x + this.ball.radius > this.width) {
			this.score.player1++;
			if (this.score.player1 >= 5) {
				this.gameOver = true;
				return;
			}
			this.resetBall();
		}
	}

	movePaddle(playerId, direction) {
		if (this.gameOver) return; // ✅ Prevent paddle movement if game over

		const paddle = this.paddles[playerId];
		if (!paddle) return;

		const moveBy = this.paddleSpeed;
		if (direction === 'up') {
			paddle.y = Math.max(0, paddle.y - moveBy);
		} else if (direction === 'down') {
			paddle.y = Math.min(this.height - paddle.height, paddle.y + moveBy);
		} else {
			console.warn(`Invalid direction: ${direction}`);
		}
	}

	checkCollisions() {
		if (this.gameOver) return;

		const ball = this.ball;
		const paddle1 = this.paddles.player1;
		const paddle2 = this.paddles.player2;

		if (
			ball.x - ball.radius <= paddle1.width &&
			ball.y >= paddle1.y &&
			ball.y <= paddle1.y + paddle1.height
		) {
			ball.vx *= -1;
			ball.x = paddle1.width + ball.radius;
		}

		if (
			ball.x + ball.radius >= this.width - paddle2.width &&
			ball.y >= paddle2.y &&
			ball.y <= paddle2.y + paddle2.height
		) {
			ball.vx *= -1;
			ball.x = this.width - paddle2.width - ball.radius;
		}
	}

	updateScores() {
		// Optional UI/audio hooks
	}

	resetBall() {
		this.ball.x = this.width / 2;
		this.ball.y = this.height / 2;
		this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 2);
		this.ball.vy = 3 * (Math.random() > 0.5 ? 1 : -1);
	}

	resetGame() {
		this.score = { player1: 0, player2: 0 };
		this.paddles.player1.y = 250;
		this.paddles.player2.y = 250;
		this.gameOver = false;
		this.resetBall();
	}

	getState() {
		return {
			width: this.width,
			height: this.height,
			paddles: this.paddles,
			ball: this.ball,
			score: this.score,
			gameOver: this.gameOver, // ✅ Expose game over flag
		};
	}
}

export default GameState;