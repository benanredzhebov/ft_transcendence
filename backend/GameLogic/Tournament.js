/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Tournament.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/19 17:09:45 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/05/23 16:04:30 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class Tournament {
	constructor() {
		this.players = new Map();   // sockedId -> alias
		this.matches = [];          // array of [[socketId, alias], [socketId, alias]]
		this.currentMatchIndex = 0;
		this.currentMatch = null;  // e.g., { player1: 'Ali', player2: 'Bob' }
	}

	registerPlayer(socketId, alias) {
		if ([...this.players.values()].includes(alias)) return false; // prevent duplicates
		this.players.set(socketId, alias);
		return true;
	}

	removePlayer(socketId) {
	if (this.players.has(socketId)) {
		this.players.delete(socketId);
		console.log(`Player with socket ${socketId} removed from tournament.`);
	}
}

	/*  Creates all unique player matchups
		1.Clears any existing matches.
		2.Uses two nested loops to pair each player with every other player once(no repeats, no self matches)
		3.Each match is stored as a pair [player1, player2] in the matches array.*/
	generateMatches() {
	this.matches = [];
	const entries = Array.from(this.players.entries()); // [[socketId, alias], ...]
	
	for (let i = 0; i < entries.length; i++) {
		for (let j = i + 1; j < entries.length; j++) {
			this.matches.push([entries[i], entries[j]]);
		}
	}
	this.currentMatchIndex = 0;
	this.currentMatch = this.matches.length > 0 ? this.matches[0] : null;
}
	
	/*Advances through the match schedule, one match at a time, until finished.
	  1.Increments currentMatchIndex
	  2.If there are more matches left, updates currentMatch to the next match and returns it.
	  3.If there no more matches, sets current to null and return null (tournament is over) */
	nextMatch() {
		this.currentMatchIndex++;
		if (this.currentMatchIndex < this.matches.length) {
			this.currentMatch = this.matches[this.currentMatchIndex];
			return this.currentMatch;
		} else {
			this.currentMatch = null;
			return null; // tournament over
		}
	}

	resetTournament() {
		this.players = new Map();
		this.matches = [];
		this.currentMatchIndex = 0;
		this.currentMatch = null;
	}
}

export default Tournament;