/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Tournament.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/19 17:09:45 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/05/19 17:10:14 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class Tournament {
	constructor() {
		this.players = [];         // Registered players (alias)
		this.matches = [];         // Match schedule (array of [player1, player2])
		this.currentMatchIndex = 0;
		this.currentMatch = null;  // e.g., { player1: 'Ali', player2: 'Bob' }
	}

	registerPlayer(alias) {
		if (this.players.includes(alias)) return false; // prevent duplicates
		this.players.push(alias);
		return true;
	}

	/*  Creates all unique player matchups
		1.Clears any existing matches.
		2.Uses two nested loops to pair each player with every other player once(no repeats, no self matches)
		3.Each match is stored as a pair [player1, player2] in the matches array.*/
	generateMatches() {
		this.matches = [];
		for (let i = 0; i < this.players.length; i++) {
			for (let j = i + 1; j < this.players.length; j++) {
				this.matches.push([this.players[i], this.players[j]]);
			}
		}
		this.currentMatchIndex = 0;
		this.currentMatch = this.matches[this.currentMatchIndex];
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
		this.players = [];
		this.matches = [];
		this.currentMatchIndex = 0;
		this.currentMatch = null;
	}
}

export default Tournament;