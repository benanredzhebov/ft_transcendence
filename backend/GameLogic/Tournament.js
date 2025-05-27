/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Tournament.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/19 17:09:45 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/05/27 16:20:43 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class Tournament {
	constructor() {
		this.players = new Map(); // socketId -> alias
		this.rounds = [];         // Array of rounds: each round = array of matches
		this.currentRound = 0;
		this.currentMatchIndex = 0;
		this.currentMatch = null;
		this.winners = [];
	}

	registerPlayer(socketId, alias) {
		if ([...this.players.values()].includes(alias)) return false;
		this.players.set(socketId, alias);
		return true;
	}

	removePlayer(socketId) {
		if (this.players.has(socketId)) {
			this.players.delete(socketId);
			console.log(`Player with socket ${socketId} removed from tournament.`);
		}
	}

	// Generates initial matches only (round 1)
	generateInitialBracket() {
		const players = Array.from(this.players.entries());
		const shuffled = players.sort(() => Math.random() - 0.5);

		const firstRound = [];
		while (shuffled.length >= 2) {
			firstRound.push([shuffled.pop(), shuffled.pop()]);
		}
		if (shuffled.length === 1) {
			firstRound.push([shuffled.pop(), null]); // Bye
		}

		this.rounds = [firstRound];
		this.currentRound = 0;
		this.currentMatchIndex = 0;
		this.winners = [];
		this.currentMatch = firstRound[0];
	}

	recordWinner(winnerSocketId) {
		if (!this.currentMatch) return null;

		this.winners.push([
			winnerSocketId,
			this.players.get(winnerSocketId),
		]);

		// Move to next match in current round
		this.currentMatchIndex++;

		if (this.currentMatchIndex < this.rounds[this.currentRound].length) {
			this.currentMatch = this.rounds[this.currentRound][this.currentMatchIndex];
			return this.currentMatch;
		}

		// End of current round
		if (this.winners.length === 1) {
			// Tournament is over
			this.currentMatch = null;
			return null;
		}

		// Generate next round
		const nextRound = [];
		const winnersShuffled = [...this.winners]; // Don't shuffle, keep order
		while (winnersShuffled.length >= 2) {
			nextRound.push([winnersShuffled.pop(), winnersShuffled.pop()]);
		}
		if (winnersShuffled.length === 1) {
			nextRound.push([winnersShuffled.pop(), null]); // Bye
		}

		this.rounds.push(nextRound);
		this.currentRound++;
		this.currentMatchIndex = 0;
		this.winners = [];
		this.currentMatch = nextRound[0];
		return this.currentMatch;
	}

	resetTournament() {
		this.players = new Map();
		this.rounds = [];
		this.currentRound = 0;
		this.currentMatchIndex = 0;
		this.currentMatch = null;
		this.winners = [];
	}
}

export default Tournament;
