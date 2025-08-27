//Game State Interfaces

export interface PaddleState {
	y: number;
	height: number;
	width: number;
}

export interface BallState {
	x: number;
	y: number;
	radius: number;
}

export interface GameState {
	paddles: { player1: PaddleState; player2: PaddleState };
	ball: BallState;
	score: { player1: number; player2: number };
	gameOver: boolean;
}

export interface TournamentMatch {
	player1: string | { alias: string };
	player2: string | { alias: string };
}

export interface TournamentResult {
	player1: string;
	player2: string;
	score1: number;
	score2: number;
}

export const SERVER_WIDTH = 900;
export const SERVER_HEIGHT = 600;