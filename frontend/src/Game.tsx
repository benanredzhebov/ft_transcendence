import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { GameStateType } from "./types";

const WS_URL = "https://localhost:3000"; // Backend URL


function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use the defined interface for the game state
  const [gameState, setGameState] = useState<GameStateType | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, { transports: ["websocket"], secure: true });
    socketRef.current = socket;

    socket.on("state_update", (state: GameStateType) => {
      setGameState(state);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Draw game
  useEffect(() => {
    if (!gameState || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, gameState.width, gameState.height);

    // Draw paddles
    ctx.fillStyle = "white";
    const p1 = gameState.paddles.player1;
    ctx.fillRect(0, p1.y, p1.width, p1.height);
    const p2 = gameState.paddles.player2;
    ctx.fillRect(gameState.width - p2.width, p2.y, p2.width, p2.height);


    // Draw ball
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, 2 * Math.PI);
    ctx.fill();


    // Draw scores
    ctx.font = "32px Arial";
    ctx.fillText(
      `${gameState.score.player1} : ${gameState.score.player2}`,
      gameState.width / 2 - 40,
      40
    );
  }, [gameState]);

  // Keyboard for paddles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!socketRef.current) return;
      // connect playert with Socket ID
      let direction: "up" | "down" | null = null;
      if (e.key === "ArrowUp" || e.key === "w") direction = "up";
      if (e.key === "ArrowDown" || e.key === "s") direction = "down";
      if (direction) {
        socketRef.current.emit("player_move", { playerId: "player1", direction });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>🎮 Pong Game</h2>
      <canvas
        ref={canvasRef}
        width={gameState?.width ?? 800}
        height={gameState?.height ?? 600}
        style={{
          border: "2px solid white",
          background: "#000",
        }}
      />
      <pre style={{ color: "white" }}>
        {gameState ? JSON.stringify(gameState, null, 2) : "Waiting for game state..."}
      </pre>
      <div style={{ color: "white" }}>
        <p>Use <b>W/S</b> or <b>Arrow Up/Down</b> to move your paddle.</p>
      </div>
    </div>
  );
}

export default Game;