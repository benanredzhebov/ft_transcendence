const SERVER_WIDTH = 900;
const SERVER_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 8;
const PADDLE_SPEED = 12;
const BALL_RADIUS = 10;
const INITIAL_BALL_SPEED_X = 4;
const INITIAL_BALL_SPEED_Y = 5;
const MAX_SCORE = 5;

class GameEngine {
    constructor() {
        this.state = {
            paddles: {
                player1: { y: SERVER_HEIGHT / 2 - PADDLE_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED },
                player2: { y: SERVER_HEIGHT / 2 - PADDLE_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED }
            },
            ball: { x: SERVER_WIDTH / 2, y: SERVER_HEIGHT / 2, radius: BALL_RADIUS, dx: 0, dy: 0 },
            score: { player1: 0, player2: 0 },
            gameOver: false // Keep gameOver for internal logic if needed
        };
        this.status = 'waiting'; // 'waiting', 'active', 'ended'
        this.resetGame(); // Initialize state
    }

    resetGame() {
        this.state.paddles.player1.y = SERVER_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        this.state.paddles.player2.y = SERVER_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        this.state.score = { player1: 0, player2: 0 };
        this.state.gameOver = false;
        this.status = 'waiting'; // Reset status
        this.resetBall(true); // Pass a flag to ensure it doesn't immediately start moving if dx/dy were random
    }

    startGame() {
        if (this.status === 'waiting') {
            this.status = 'active';
            this.state.gameOver = false;
            this.resetBall(); // Serve the ball
            console.log("GameEngine: Status set to active.");
        }
    }

    endGame() {
        this.status = 'ended';
        this.state.gameOver = true; // Mark game as over
        console.log("GameEngine: Status set to ended.");
    }

    update(dt) {
        if (this.status !== 'active' || this.state.gameOver) {
            return;
        }
        this.updateBall();
        this.checkCollisions();

        // Check for game over by score
        if (!this.state.gameOver && (this.state.score.player1 >= MAX_SCORE || this.state.score.player2 >= MAX_SCORE)) {
            this.endGame();
        }
    }

    updateBall() {
        this.state.ball.x += this.state.ball.dx;
        this.state.ball.y += this.state.ball.dy;
    }

    checkCollisions() {
        const { ball, paddles, score } = this.state;

        // Top/Bottom walls
        if (ball.y - ball.radius < 0 || ball.y + ball.radius > SERVER_HEIGHT) {
            ball.dy *= -1;
            ball.y = Math.max(ball.radius, Math.min(SERVER_HEIGHT - ball.radius, ball.y));
        }

        // Paddle 1 (left)
        if (ball.dx < 0 &&
            ball.x - ball.radius < paddles.player1.width &&
            ball.x > 0 &&
            ball.y > paddles.player1.y &&
            ball.y < paddles.player1.y + paddles.player1.height)
        {
            ball.dx *= -1;
            ball.x = paddles.player1.width + ball.radius;
        }

        // Paddle 2 (right)
        if (ball.dx > 0 &&
            ball.x + ball.radius > SERVER_WIDTH - paddles.player2.width &&
            ball.x < SERVER_WIDTH &&
            ball.y > paddles.player2.y &&
            ball.y < paddles.player2.y + paddles.player2.height)
        {
            ball.dx *= -1;
            ball.x = SERVER_WIDTH - paddles.player2.width - ball.radius;
        }

        // Score
        let scored = false;
        if (ball.x - ball.radius < 0) {
            score.player2++;
            scored = true;
        } else if (ball.x + ball.radius > SERVER_WIDTH) {
            score.player1++;
            scored = true;
        }

        if (scored) {
            if (score.player1 >= MAX_SCORE || score.player2 >= MAX_SCORE) {
                this.state.gameOver = true;
                ball.dx = 0;
                ball.dy = 0;
            } else {
                this.resetBall();
            }
        }
    }

    resetBall(initialReset = false) {
        this.state.ball.x = SERVER_WIDTH / 2;
        this.state.ball.y = SERVER_HEIGHT / 2;
        if (initialReset || this.status !== 'active') { // Don't give speed if it's an initial reset before game starts
            this.state.ball.dx = 0;
            this.state.ball.dy = 0;
        } else {
            this.state.ball.dx = INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1);
            this.state.ball.dy = INITIAL_BALL_SPEED_Y * (Math.random() > 0.5 ? 1 : -1);
        }
    }

    handlePlayerInput(playerId, direction) {
        const paddle = playerId === 'player1' ? this.state.paddles.player1 : this.state.paddles.player2;
        if (!paddle) return;

        if (direction === 'up') {
            paddle.y -= paddle.speed;
        } else if (direction === 'down') {
            paddle.y += paddle.speed;
        }

        paddle.y = Math.max(0, Math.min(SERVER_HEIGHT - paddle.height, paddle.y));
    }

    getState() {
        return this.state;
    }
}

module.exports = GameEngine;