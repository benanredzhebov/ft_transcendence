/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameState.js                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: pfalli <pfalli@student.42wolfsburg.de>     +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/06 14:27:35 by beredzhe          #+#    #+#             */
/*   Updated: 2025/07/08 16:38:52 by pfalli           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class GameState {
	constructor() {
		this.width = 900;
		this.height = 600;
		this.paddleSpeed = 15;
		this.initialBallSpeed = 5;
		this.maxBallSpeed = 15;

		this.paddles = {
			player1: { y: 250, height: 100, width: 10 },
			player2: { y: 250, height: 100, width: 10 },
		};

		this.ball = {
			x: this.width / 2,
			y: this.height / 2,
			vx: 0,
			vy: 0,
			radius: 10,
			speed: this.initialBallSpeed};

		this.score = {
			player1: 0,
			player2: 0
		};

		this.gameOver = false;
		this.paused = true; // Start paused until players join
		this.lastScorer = null;

		this.connectedPlayers = new Set();
		this.socketToPlayerMap = new Map();
}

	addPlayer(socketId) {
		if (this.connectedPlayers.size >= 2 && socketId !== 'local_player2') return false;
		
		const playerId = this.connectedPlayers.size === 0 ? 'player1' : 'player2';
		this.connectedPlayers.add(socketId);
		this.socketToPlayerMap.set(socketId, playerId);
		return true;
	}

	removePlayer(socketId) {
		console.log('removePlayer called for', socketId);
		if (!this.connectedPlayers.has(socketId)) return;
		this.connectedPlayers.delete(socketId);
		this.socketToPlayerMap.delete(socketId);
		if (!this.gameOver && this.connectedPlayers.size < 2) {
				this.resetGame();
		}
	}

	getPlayerId(socketId) {
		return this.socketToPlayerMap.get(socketId);
	}

	update(dt) {
	if (this.gameOver || this.paused) return;
	this.updateBall(dt);
	this.checkCollisions();
	}

	updateBall(dt) {
		const frameCorrection = dt * 60;
		this.ball.x += this.ball.vx * frameCorrection;
		this.ball.y += this.ball.vy * frameCorrection;

		// Wall collisions (clamp and bounce)
		if (this.ball.y - this.ball.radius < 0) {
			this.ball.y = this.ball.radius;
			this.ball.vy *= -1;
		}
		if (this.ball.y + this.ball.radius > this.height) {
			this.ball.y = this.height - this.ball.radius;
			this.ball.vy *= -1;
		}

		// Scoring
		if (this.ball.x - this.ball.radius < 0) {
			this.handleScore('player2');
		} else if (this.ball.x + this.ball.radius > this.width) {
			this.handleScore('player1');
		}
	}

	handleScore(scorer) {
		this.score[scorer]++;
		this.lastScorer = scorer;
		if (this.score[scorer] >= 5) {
			this.gameOver = true;
		} else {
			this.resetBall();
		}
	}

	movePaddle(playerId, direction) {		
		if (this.gameOver || this.paused) {
			console.log('❌ movePaddle blocked: game is paused or over');
			return;
		}
		const paddle = this.paddles[playerId];
		if (!paddle) {
			console.log('❌ No paddle found');
			return;
		}
		
		const moveBy = this.paddleSpeed;
		
		if (direction === 'up') {
			paddle.y = Math.max(0, paddle.y - moveBy);
		} else if (direction === 'down') {
			paddle.y = Math.min(this.height - paddle.height, paddle.y + moveBy);
		}
	}

	checkCollisions() {
		const ball = this.ball;
			const paddle1 = this.paddles.player1;
			const paddle2 = this.paddles.player2;

			// Player 1 collision
		if (ball.x - ball.radius <= paddle1.width + 5 &&
			ball.y >= paddle1.y &&
			ball.y <= paddle1.y + paddle1.height &&
			ball.vx < 0 ) {
			this.handlePaddleCollision(paddle1, 'right');
		}

			// Player 2 collision
		if (ball.x + ball.radius >= this.width - paddle2.width - 5 &&
			ball.y >= paddle2.y &&
			ball.y <= paddle2.y + paddle2.height &&
			ball.vx > 0) {
				this.handlePaddleCollision(paddle2, 'left');
		}
	}

	handlePaddleCollision(paddle, side) {
		const relativeIntersect = (paddle.y + (paddle.height / 2)) - this.ball.y;
		const normalizedRelative = relativeIntersect / (paddle.height / 2);
		const bounceAngle = normalizedRelative * (Math.PI / 4);

		// Increasing the ball on each hit *1.05
		this.ball.speed = Math.min(this.ball.speed * 1.05, this.maxBallSpeed);
		this.ball.vx = this.ball.speed * (side === 'right' ? 1 : -1);
		this.ball.vy = -this.ball.speed * Math.sin(bounceAngle);
	}

	resetBall() {
		this.ball.x = this.width / 2;
		this.ball.y = this.height / 2;
		this.ball.speed = this.initialBallSpeed;

		const serveDirection = this.lastScorer === 'player1' ? -1 : 1;
		const randomAngle = (Math.random() * Math.PI / 3) - (Math.PI / 6);

		this.ball.vx = this.ball.speed * serveDirection * Math.cos(randomAngle);
		this.ball.vy = this.ball.speed * Math.sin(randomAngle);
	}

	resetGame() {
		this.score = { player1: 0, player2: 0 };
		this.paddles.player1.y = 250;
		this.paddles.player2.y = 250;
		this.gameOver = false;
		// Don't automatically unpause - let startMatch() handle that
		this.lastScorer = null;
		// Reset ball position but not velocity - let resume() handle that
		this.ball.x = this.width / 2;
		this.ball.y = this.height / 2;
		this.ball.vx = 0;
		this.ball.vy = 0;
		console.log('After resetGame', 'gameOver:', this.gameOver, 'paused:', this.paused);
	}

	pause() {
		this.paused = true;
	}

	resume() {
		this.paused = false;
		// Start ball movement when game resumes
		if (this.ball.vx === 0 && this.ball.vy === 0) {
			const serveDirection = this.lastScorer === 'player1' ? -1 : 1;
			const randomAngle = (Math.random() * Math.PI / 3) - (Math.PI / 6);
			this.ball.vx = this.ball.speed * serveDirection * Math.cos(randomAngle);
			this.ball.vy = this.ball.speed * Math.sin(randomAngle);
		}
	}

	getState() {
		return {
			width: this.width,
			height: this.height,
			paddles: this.paddles,
			ball: this.ball,
			score: this.score,
			gameOver: this.gameOver,
			paused: this.paused
		};
	}
}

export default GameState;