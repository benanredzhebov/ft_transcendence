class AIOpponent {
    constructor(gameEngine, difficulty = 'medium') {
        this.gameEngine = gameEngine;
        this.difficulty = difficulty;
        this.targetY = this.gameEngine.state.height / 2;
        this.updateInterval = 1000; // AI thinks once per second
        this.lastUpdateTime = 0;
        this.reactionTime = 100; // ms
        this.errorMargin = 50; // pixels
    }

    predictBallLandingY() {
        const state = this.gameEngine.getState();
        const { ball, width, height } = state;

        // If ball is moving away, don't predict yet
        if (ball.vx < 0) {
            return height / 2;
        }

        let simBall = { ...ball };
        const timeToReachPaddle = (width - simBall.x) / simBall.vx;
        let predictedY = simBall.y + simBall.vy * timeToReachPaddle;

        // Handle wall bounces
        if (predictedY < 0) {
            predictedY = -predictedY;
        } else if (predictedY > height) {
            predictedY = height - (predictedY - height);
        }
        
        // Add some inaccuracy based on difficulty
        const error = (Math.random() - 0.5) * 2 * this.errorMargin;
        return predictedY + error;
    }

    update() {
        const now = Date.now();
        const state = this.gameEngine.getState();

        // Only update the target position once per second
        if (now - this.lastUpdateTime > this.updateInterval) {
            this.lastUpdateTime = now;
            // Add a "reaction time" delay
            setTimeout(() => {
                this.targetY = this.predictBallLandingY();
            }, this.reactionTime);
        }

        // Move paddle towards targetY on every tick
        const aiPaddle = state.paddles.player2;
        const paddleCenter = aiPaddle.y + aiPaddle.height / 2;

        if (Math.abs(paddleCenter - this.targetY) > 10) { // Move only if far enough
            if (paddleCenter < this.targetY) {
                this.gameEngine.handlePlayerInput('player2', 'down');
            } else {
                this.gameEngine.handlePlayerInput('player2', 'up');
            }
        }
    }
}

export default AIOpponent;