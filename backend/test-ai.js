import GameEngine from './GameLogic/GameEngine.js';

console.log('Testing AI mode setup...');
const game = new GameEngine();
game.setTournamentMode(false, 'ai');
console.log('AI Opponent initialized:', !!game.aiOpponent);

// Test adding a player
game.addPlayer('test_player');
console.log('Player added, connected players:', game.state.connectedPlayers.size);

// Test a few updates
console.log('Testing AI updates...');
for (let i = 0; i < 5; i++) {
    game.update();
    console.log(`Update ${i + 1} completed`);
}

console.log('AI test completed successfully!');