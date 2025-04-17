// filepath: c:\Users\piero\Desktop\groupTrascendence\frontend\src\types.ts
export interface Paddle {
  y: number;
  height: number;
  width: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Score {
  player1: number;
  player2: number;
}

export interface GameStateType {
  width: number;
  height: number;
  paddles: Record<string, Paddle>;
  ball: Ball;
  score: Score;
}