/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Tournament.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: pfalli <pfalli@student.42wolfsburg.de>     +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/08 13:21:32 by beredzhe          #+#    #+#             */
/*   Updated: 2025/07/09 11:22:09 by pfalli           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class Tournament {
  constructor() {
	this.players = new Map();       // socketId -> { alias, isReady }
	this.rounds = [];               // Array of rounds
	this.currentRound = 0;
	this.currentMatchIndex = 0;
	this.currentMatch = null;
	this.winners = [];
	this.byes = new Set();          // Track players who got byes
	this.allMatches = [];			//
	this.isFinished = false;		//
	this.tournamentWinner = null;	//
  }
  
  // it checks if the alias is registered and prevents duplicate user registration
  registerPlayer(socketId, alias, user) {
	// Check if alias is already taken
	const aliases = [...this.players.values()].map(p => p.alias);
	if (aliases.includes(alias)) return false;

	// Check if this user (by userId) is already registered in the tournament
	const userIds = [...this.players.values()].map(p => p.userId);
	if (userIds.includes(user.userId)) return false;

	this.players.set(socketId, {
	  alias,
	  isReady: false,
	  userId: user.userId, // ***new: to store Match data***
	  username: user.username // ***new: to store Match data***
	});
	return true;
  }

  // ***new: aliases were not cleared after Tournament***
  reset() {
	this.players.clear();
	this.rounds = [];
	this.currentRound = 0;
	this.currentMatchIndex = 0;
	this.currentMatch = null;
	this.winners = [];
	this.byes.clear();
	this.allMatches = [];
	this.isFinished = false;
	this.tournamentWinner = null;
	console.log('Tournament has been reset.');
  }

  markPlayerReady(socketId) {
	if (this.players.has(socketId)) {
	  this.players.get(socketId).isReady = true;
	}
  }

  resetPlayersReady(socketId1, socketId2) {
	if (this.players.has(socketId1)) this.players.get(socketId1).isReady = false;
	if (socketId2 && this.players.has(socketId2)) this.players.get(socketId2).isReady = false;
  }

  allPlayersReady() {
	// Get the current match players specifically
	const { player1, player2 } = this.getCurrentMatchPlayers();
	
	// For a real match (not bye), both players must be ready
	if (player1 && player2) {
		return player1.isReady && player2.isReady;
	}
	
	// For bye matches or single player scenarios, just check if the single player is ready
	if (player1 && !player2) {
		return player1.isReady;
	}
	
	// Should not happen, but fallback to old logic
	const activePlayers = [...this.players.keys()].filter(
	  id => !this.byes.has(id)
	);
	return activePlayers.every(id => this.players.get(id).isReady);
  }

  removePlayer(socketId) {
	if (this.players.has(socketId)) {
	  this.players.delete(socketId);
	  this.byes.delete(socketId);
	}
  }

  canStartTournament() {
	return this.players.size >= 2;
  }

  generateInitialBracket() {
	if (!this.canStartTournament()) {
		throw new Error("Not enough players to start tournament");
	}

	const players = Array.from(this.players.entries());
	const shuffled = [...players].sort(() => Math.random() - 0.5);

	const firstRound = [];
	while (shuffled.length >= 2) {
		firstRound.push([shuffled.pop(), shuffled.pop()]);
	}

	// Handle odd player count
	if (shuffled.length === 1) {
		const byePlayer = shuffled.pop();
		if (byePlayer) {
			firstRound.push([byePlayer, null]);
			this.byes.add(byePlayer[0]); // Mark player as having a bye
		}
	}

	this.rounds = [firstRound];
	this.currentRound = 0;
	this.currentMatchIndex = 0;
	this.currentMatch = firstRound[0];
  }

  recordWinner(winnerSocketId, scores = null) {
	if (!this.currentMatch) return null;

	// Validate winner is part of current match
	const [p1, p2] = this.currentMatch;
	const validWinner = [p1?.[0], p2?.[0]].includes(winnerSocketId);
	if (!validWinner) {
	  throw new Error("Winner is not part of current match");
	}

	// Prepare match result object
	const matchResult = {
	  round: this.currentRound + 1,
	  player1: p1 ? { socketId: p1[0], alias: this.players.get(p1[0])?.alias } : null,
	  player2: p2 ? { socketId: p2[0], alias: this.players.get(p2[0])?.alias } : null,
	  winner: winnerSocketId ? { socketId: winnerSocketId, alias: this.players.get(winnerSocketId)?.alias } : null,
	  scores: scores // Add scores to match result
	};
	this.allMatches.push(matchResult);

	// Handle bye automatically
	if (this.byes.has(winnerSocketId)) {
	  // For bye matches, we still want to record them in match history
	  this.winners.push([winnerSocketId, this.players.get(winnerSocketId).alias]);
	  return this.advanceToNextMatch();
	}

	// Normal match winner
	this.winners.push([
	  winnerSocketId,
	  this.players.get(winnerSocketId).alias
	]);

	return this.advanceToNextMatch();
  }
  // Returns an array of all match results from the tournament
  getAllMatchResults() {
	const results = this.allMatches.map(match => {
	  const p1 = match.player1 ? match.player1.alias : 'BYE';
	  const p2 = match.player2 ? match.player2.alias : 'BYE';
	  const winner = match.winner ? match.winner.alias : 'N/A';
	  
	  // Add scores if available
	  let scoreText = '';
	  if (match.scores && match.scores.player1 !== undefined && match.scores.player2 !== undefined) {
		scoreText = ` (${match.scores.player1} - ${match.scores.player2})`;
	  }
	  
	  return `Round ${match.round}: ${p1} vs ${p2}${scoreText} => Winner: ${winner}`;
	});
	
	// Add final tournament result if tournament is finished
	// if (this.isFinished && this.tournamentWinner) {
	//   results.push(`🏆 TOURNAMENT CHAMPION: ${this.tournamentWinner[1]}`);
	// }
	
	return results;
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

  getNextMatch() {
	// Check if there are more matches in current round
	if (this.currentMatchIndex + 1 < this.rounds[this.currentRound].length) {
	  return this.rounds[this.currentRound][this.currentMatchIndex + 1];
	}
	
	// Check if we can generate next round
	if (this.winners.length > 1) {
	  // Simulate next round generation to see what the next match would be
	  const winnersCopy = [...this.winners];
	  if (winnersCopy.length >= 2) {
		return [winnersCopy.pop(), winnersCopy.pop()];
	  }
	}
	
	return null; // No more matches
  }

  generateNextRound() {
	const nextRound = [];
	const winnersCopy = [...this.winners];

	while (winnersCopy.length >= 2) {
		nextRound.push([winnersCopy.pop(), winnersCopy.pop()]);
	}

	// Handle odd number of winners
	if (winnersCopy.length === 1) {
		// const [byeWinner] = winnersCopy.pop();
		// nextRound.push([byeWinner, null]);
		nextRound.push([winnersCopy.pop(), null]);
		// this.byes.add(byeWinner[0]);
	}

	this.rounds.push(nextRound);
	this.currentRound++;
	this.currentMatchIndex = 0;
	this.winners = [];
	this.currentMatch = nextRound[0];

	// If the match is a bye, immediately record the winner and advance
	if (this.currentMatch && this.currentMatch[1] === null) {
		this.recordWinner(this.currentMatch[0][0]); // No scores for bye matches
	}
	return this.currentMatch;
  }

  getCurrentMatchPlayers() {
	if (!this.currentMatch) return { player1: null, player2: null };

	const [p1Data, p2Data] = this.currentMatch;
	const player1 = p1Data ? this.players.get(p1Data[0]) : null;
	const player2 = p2Data ? this.players.get(p2Data[0]) : null;

	// Add socketId back for other logic that might need it
	if (player1 && p1Data) player1.socketId = p1Data[0];
	if (player2 && p2Data) player2.socketId = p2Data[0];

	return { player1, player2 };
  }

  resetReadyForCurrentMatch() {
	const { player1, player2 } = this.getCurrentMatchPlayers();
	if (player1 && this.players.has(player1.socketId)) {
	  this.players.get(player1.socketId).isReady = false;
	}
	if (player2 && this.players.has(player2.socketId)) {
	  this.players.get(player2.socketId).isReady = false;
	}
  }

  resetTournament() {
	this.players = new Map();
	this.rounds = [];
	this.currentRound = 0;
	this.currentMatchIndex = 0;
	this.currentMatch = null;
	this.winners = [];
	this.byes = new Set();
  }

  // Get dynamic bracket structure showing current state with winners
  getDynamicBracket() {
	const bracketRounds = [];
	
	for (let roundIdx = 0; roundIdx < this.rounds.length; roundIdx++) {
	  const round = this.rounds[roundIdx];
	  const bracketRound = [];
	  
	  round.forEach((match, matchIdx) => {
		const [p1Data, p2Data] = match;
		const player1 = p1Data ? this.players.get(p1Data[0])?.alias : null;
		const player2 = p2Data ? this.players.get(p2Data[0])?.alias : null;
		
		// Find if this match has been completed
		const completedMatch = this.allMatches.find(m => 
		  m.round === roundIdx + 1 && 
		  ((m.player1?.alias === player1 && m.player2?.alias === player2) ||
		   (m.player1?.alias === player2 && m.player2?.alias === player1))
		);
		
		const bracketMatch = {
		  player1,
		  player2,
		  winner: completedMatch ? completedMatch.winner?.alias : null,
		  scores: completedMatch ? completedMatch.scores : null,
		  isComplete: !!completedMatch,
		  isCurrent: roundIdx === this.currentRound && matchIdx === this.currentMatchIndex,
		  isBye: !player1 || !player2
		};
		
		bracketRound.push(bracketMatch);
	  });
	  
	  bracketRounds.push(bracketRound);
	}
	
	return { 
	  rounds: bracketRounds,
	  currentRound: this.currentRound,
	  isFinished: this.isFinished,
	  tournamentWinner: this.tournamentWinner ? this.tournamentWinner[1] : null
	};
  }
}

export default Tournament;