/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LocalTournamentMode.js                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/08/20 10:00:00 by beredzhe          #+#    #+#             */
/*   Updated: 2025/08/20 16:01:39 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import GameEngine from './GameEngine.js';
import GameState from './GameState.js';

class LocalTournamentMode {
  constructor() {
    this.players = new Map();       // playerId -> { name, isReady }
    this.rounds = [];               // Array of rounds
    this.currentRound = 0;
    this.currentMatchIndex = 0;
    this.currentMatch = null;
    this.winners = [];
    this.allMatches = [];
    this.isFinished = false;
    this.tournamentWinner = null;
    this.gameEngine = null;         // Current game engine for matches
    this.socketId = null;           // Single socket for local tournament
  }

  // Initialize local tournament with player names
  initializeTournament(socketId, playerNames) {
    if (playerNames.length < 2) {
      throw new Error("At least 2 players are required for a local tournament");
    }

    this.socketId = socketId;
    this.players.clear();
    this.reset();

    // Add all players with local IDs
    playerNames.forEach((name, index) => {
      const playerId = `local_player_${index + 1}`;
      this.players.set(playerId, {
        name: name.trim() || `Player ${index + 1}`,
        isReady: false
      });
    });

    return true;
  }

  reset() {
    this.rounds = [];
    this.currentRound = 0;
    this.currentMatchIndex = 0;
    this.currentMatch = null;
    this.winners = [];
    this.allMatches = [];
    this.isFinished = false;
    this.tournamentWinner = null;
    if (this.gameEngine) {
      this.gameEngine = null;
    }
    console.log('Local Tournament has been reset.');
  }

  canStartTournament() {
    return this.players.size >= 2;
  }

  generateInitialBracket() {
    if (!this.canStartTournament()) {
      throw new Error("Not enough players to start local tournament");
    }

    const players = Array.from(this.players.entries());
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    const firstRound = [];
    while (shuffled.length >= 2) {
      firstRound.push([shuffled.pop(), shuffled.pop()]);
    }

    // Handle odd player count with bye
    if (shuffled.length === 1) {
      const byePlayer = shuffled.pop();
      if (byePlayer) {
        firstRound.push([byePlayer, null]); // null represents bye
      }
    }

    this.rounds = [firstRound];
    this.currentRound = 0;
    this.currentMatchIndex = 0;
    this.currentMatch = firstRound[0];

    return this.currentMatch;
  }

  // Start a match between two players (or handle bye)
  startCurrentMatch() {
    if (!this.currentMatch) {
      throw new Error("No current match to start");
    }

    const [player1Data, player2Data] = this.currentMatch;

    // Handle bye match
    if (!player2Data) {
      console.log(`${player1Data[1].name} gets a bye`);
      return this.recordWinner(player1Data[0], { player1: 0, player2: 0, isBye: true });
    }

    // Create new game engine for this match
    this.gameEngine = new GameEngine();
    this.gameEngine.setTournamentMode(true, 'local_tournament');
    this.gameEngine.isLocalTournament = true;

    // Add players to the game engine
    this.gameEngine.addPlayer(this.socketId);
    
    // Start the match and reset ball to get initial velocity
    this.gameEngine.startMatch();
    this.gameEngine.state.resetBall();
    
    // Set up the match
    console.log(`Starting match: ${player1Data[1].name} vs ${player2Data[1].name}`);
    
    return {
      player1: { id: player1Data[0], name: player1Data[1].name },
      player2: { id: player2Data[0], name: player2Data[1].name },
      gameState: this.gameEngine.getState()
    };
  }

  // Handle game input for current match
  handleGameInput(input) {
    if (!this.gameEngine) {
      throw new Error("No active game to handle input for");
    }

    return this.gameEngine.handlePlayerInput(input.playerId, input.direction);
  }

  // Get current game state
  getGameState() {
    if (!this.gameEngine) {
      return null;
    }
    return this.gameEngine.getState();
  }

  // Update game physics
  updateGame() {
    if (!this.gameEngine) {
      return null;
    }
    this.gameEngine.update();
    return this.gameEngine.getState();
  }

  recordWinner(winnerId, scores = null) {
    if (!this.currentMatch) return null;

    const [p1, p2] = this.currentMatch;
    
    // Validate winner for non-bye matches
    if (p2 && ![p1[0], p2[0]].includes(winnerId)) {
      throw new Error("Winner is not part of current match");
    }

    // Prepare match result object
    const matchResult = {
      round: this.currentRound + 1,
      player1: p1 ? { id: p1[0], name: p1[1].name } : null,
      player2: p2 ? { id: p2[0], name: p2[1].name } : null,
      winner: winnerId ? { id: winnerId, name: this.players.get(winnerId)?.name } : null,
      scores: scores
    };
    this.allMatches.push(matchResult);

    // Add winner to winners list
    this.winners.push([winnerId, this.players.get(winnerId)]);

    // Clean up current game
    this.gameEngine = null;

    return this.advanceToNextMatch();
  }

  advanceToNextMatch() {
    this.currentMatchIndex++;

    // More matches in current round
    if (this.currentMatchIndex < this.rounds[this.currentRound].length) {
      this.currentMatch = this.rounds[this.currentRound][this.currentMatchIndex];
      return this.currentMatch;
    }

    // Tournament finished
    if (this.winners.length === 1) {
      this.tournamentWinner = this.winners[0];
      this.isFinished = true;
      this.currentMatch = null;
      return null;
    }

    // Generate next round
    return this.generateNextRound();
  }

  generateNextRound() {
    const nextRound = [];
    const winnersCopy = [...this.winners];

    while (winnersCopy.length >= 2) {
      nextRound.push([winnersCopy.pop(), winnersCopy.pop()]);
    }

    // Handle odd number of winners
    if (winnersCopy.length === 1) {
      nextRound.push([winnersCopy.pop(), null]);
    }

    this.rounds.push(nextRound);
    this.currentRound++;
    this.currentMatchIndex = 0;
    this.winners = [];
    this.currentMatch = nextRound[0];

    // If the match is a bye, immediately record the winner and advance
    if (this.currentMatch && this.currentMatch[1] === null) {
      this.recordWinner(this.currentMatch[0][0], { player1: 0, player2: 0, isBye: true });
    }

    return this.currentMatch;
  }

  getCurrentMatchPlayers() {
    if (!this.currentMatch) return { player1: null, player2: null };

    const [p1Data, p2Data] = this.currentMatch;
    const player1 = p1Data ? { id: p1Data[0], ...p1Data[1] } : null;
    const player2 = p2Data ? { id: p2Data[0], ...p2Data[1] } : null;

    return { player1, player2 };
  }

  // Returns an array of all match results from the tournament
  getAllMatchResults() {
    const results = this.allMatches.map(match => {
      const p1 = match.player1 ? match.player1.name : 'BYE';
      const p2 = match.player2 ? match.player2.name : 'BYE';
      const winner = match.winner ? match.winner.name : 'N/A';
      
      let scoreText = '';
      if (match.scores && !match.scores.isBye && 
          match.scores.player1 !== undefined && match.scores.player2 !== undefined) {
        scoreText = ` (${match.scores.player1}-${match.scores.player2})`;
      }
      
      return `Round ${match.round}: ${p1} vs ${p2}${scoreText} => Winner: ${winner}`;
    });
    
    return results;
  }

  // Get dynamic bracket structure showing current state with winners
  getDynamicBracket() {
    const bracketRounds = [];
    
    for (let roundIdx = 0; roundIdx < this.rounds.length; roundIdx++) {
      const round = this.rounds[roundIdx];
      const bracketRound = [];
      
      for (let matchIdx = 0; matchIdx < round.length; matchIdx++) {
        const [p1, p2] = round[matchIdx];
        const matchInfo = {
          player1: p1 ? { id: p1[0], name: p1[1].name } : null,
          player2: p2 ? { id: p2[0], name: p2[1].name } : null,
          winner: null,
          isCurrentMatch: roundIdx === this.currentRound && matchIdx === this.currentMatchIndex,
          isCompleted: roundIdx < this.currentRound || 
                      (roundIdx === this.currentRound && matchIdx < this.currentMatchIndex)
        };
        
        // Find winner from match results
        const matchResult = this.allMatches.find(m => 
          m.round === roundIdx + 1 && 
          m.player1?.id === p1?.[0] && 
          m.player2?.id === p2?.[0]
        );
        
        if (matchResult && matchResult.winner) {
          matchInfo.winner = matchResult.winner;
        }
        
        bracketRound.push(matchInfo);
      }
      
      bracketRounds.push(bracketRound);
    }
    
    return { 
      rounds: bracketRounds,
      currentRound: this.currentRound,
      isFinished: this.isFinished,
      tournamentWinner: this.tournamentWinner ? this.tournamentWinner[1].name : null
    };
  }

  getTournamentStatus() {
    return {
      isActive: !this.isFinished && this.currentMatch !== null,
      isFinished: this.isFinished,
      currentRound: this.currentRound + 1,
      totalRounds: this.rounds.length,
      currentMatch: this.getCurrentMatchPlayers(),
      winner: this.tournamentWinner ? this.tournamentWinner[1].name : null,
      bracket: this.getDynamicBracket(),
      matchHistory: this.getAllMatchResults()
    };
  }
}

export default LocalTournamentMode;