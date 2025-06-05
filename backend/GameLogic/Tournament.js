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

  registerPlayer(socketId, alias) {
	// Validate alias uniqueness
	const aliases = [...this.players.values()].map(p => p.alias);
	if (aliases.includes(alias)) return false;

	this.players.set(socketId, {
	  alias,
	  isReady: false
	});
	return true;
  }

  markPlayerReady(socketId) {
	if (this.players.has(socketId)) {
	  this.players.get(socketId).isReady = true;
	}
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
	if (!this.currentMatch) return null;
	
	const [p1, p2] = this.currentMatch;
	return {
	  player1: p1 ? { socketId: p1[0], alias: p1[1] } : null,
	  player2: p2 ? { socketId: p2[0], alias: p2[1] } : null
	};
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