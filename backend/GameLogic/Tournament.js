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
  }
  
  // it checks if the alias is registered
  registerPlayer(socketId, alias, user) {
    const aliases = [...this.players.values()].map(p => p.alias);
    if (aliases.includes(alias)) return false;

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

  recordWinner(winnerSocketId) {
	if (!this.currentMatch) return null;

	// Validate winner is part of current match
	const [p1, p2] = this.currentMatch;
	const validWinner = [p1?.[0], p2?.[0]].includes(winnerSocketId);
	if (!validWinner) {
	  throw new Error("Winner is not part of current match");
	}

	// Handle bye automatically
	if (this.byes.has(winnerSocketId)) {
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

  advanceToNextMatch() {
	this.currentMatchIndex++;

	// More matches in current round
	if (this.currentMatchIndex < this.rounds[this.currentRound].length) {
	  this.currentMatch = this.rounds[this.currentRound][this.currentMatchIndex];
	  return this.currentMatch;
	}

	// Tournament finished
	if (this.winners.length === 1) {
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
		this.recordWinner(this.currentMatch[0][0]);
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
}

export default Tournament;