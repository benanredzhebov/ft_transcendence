

function Game() {

  return (
    <div style={{ textAlign: "center" }}>
      <h2>🎮 Pong Game</h2>
      <canvas
        width={900}
        height={600}
        style={{
          border: "2px solid white",
          background: "#000",
        }}
      />
    </div>
  );
};

export default Game;