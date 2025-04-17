/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GameState.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/12 15:41:55 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/04/15 14:18:15 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/* Stores current state of the game (positions, score) */

type Paddle = {
	y: number; // The vertical position of the paddle
	height: number; // The dimension of the paddle
	width: number; // The dimension of the paddle
};

  type Ball = {
	x: number; // The position of the ball
	y: number; // The position of the ball
	vx: number; // The velocity of the ball in the horizontal directions.
	vy: number; //The velocity of the ball in the vertical directions.
	radius: number; // The size of the ball
  };
  
  type Score = {
	player1: number;
	player2: number;
  };

  /* GameState class manages the entire game state, including paddles, ball, and score */
  export class GameState {
	width: number = 800; // Game width
	height: number = 600; // Game height
	paddleSpeed: number = 10;
	
	/* Stores the positions and dimensions of the two paddles */
	paddles: Record<string, Paddle> = {
	  player1: { y: 250, height: 100, width: 10 },
	  player2: { y: 250, height: 100, width: 10 },
	};
	
	/* Stores the position, velocity, and size of the ball */
	ball: Ball = {
	  x: this.width / 2, // Ball starts at the horizontal center of the screen
	  y: this.height / 2, // Ball starts at the vertical center of the screen
	  vx: 5, // horizontal speed of the ball
	  vy: 3, // vertical speed of the ball
	  radius: 10,
	};
  
	score: Score = {
	  player1: 0,
	  player2: 0,
	};
	
	/* **METHODS** */
	
	/* 1.Updates the ball's position based on its velocity and the time delta */
	updateBall(dt: number) {
		/* The ball's position(x,y) is updated based on its velocity(vx, vy)
		and the time delta */
	  this.ball.x += this.ball.vx * dt * 60; // Scale velocity by frame time
	  this.ball.y += this.ball.vy * dt * 60; // 
  
	  // Top or bottom wall collision
	  /* <0 the ball's top edge goes above the screen
	  > this.height the ball's bottom edge goes below the screen*/
	  if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > this.height) {
		this.ball.vy *= -1; // Reverse Y direction(if collision occurs)
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
	
	/* 2.Moves a paddle up or down based on the player's input */
	movePaddle(playerId: string, direction: "up" | "down") {
	  const paddle = this.paddles[playerId]; //get the paddle
	  if (!paddle) return;
  
	  const moveBy = this.paddleSpeed; // Determine movement distance
	  if (direction === "up") {
		paddle.y = Math.max(0, paddle.y - moveBy); // if up, the paddle's vertical position (y) is decreased by moveBY
	  } else {
		paddle.y = Math.min(this.height - paddle.height, paddle.y + moveBy); // if down, the paddle's vertical position(y) is increased by moveBY 
	  }
	}
	
	/* Checks if the ball collides with either paddle */
	checkCollisions() {
	  const ball = this.ball;
	  const paddle1 = this.paddles.player1;
	  const paddle2 = this.paddles.player2;
  
	// Paddle1 collision (left)\
		/* if a collusion occurs, the ball's horizontal velocity
		(vx) is reversed, and its position is adjusted to prevemnt it 
		from "sticking" to the paddle */
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
		ball.x = this.width - paddle2.width - ball.radius;
	  }
	}
  
	updateScores() {
	  // (optional) add sound effects or UI update logic hooks here
	}
	
	/* Resets the ball to the center of the game area.
	Reverses the ball's horizontal velocity(vx) and 
	randomizes its vetical velocity(vy) */
	resetBall() {
	  this.ball.x = this.width / 2;
	  this.ball.y = this.height / 2;
	  this.ball.vx *= -1;
	  this.ball.vy = 3 * (Math.random() > 0.5 ? 1 : -1); // Randomize up/down
	}
  }