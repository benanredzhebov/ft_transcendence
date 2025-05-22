/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Tournament.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/19 17:09:45 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/05/22 14:45:07 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class Tournament {
	constructor() {
		this.players = new Set();   // Registered players (alias)
		this.matches = [];         // Match schedule (array of [player1, player2])
		this.currentMatchIndex = 0;
		this.currentMatch = null;  // e.g., { player1: 'Ali', player2: 'Bob' }
	}

	registerPlayer(alias, socketId) {
		if (this.players.has(alias)) return false;
		this.players.add(alias, socketId);
		return true;
	}

	removePlayerBySocketId(socketId) {
		for (let [alias, id] of this.players.entries()) {
			if (id === socketId) {
				this.players.delete(alias);
				break;
			}
		}
	}

	/*  Creates all unique player matchups
		1.Clears any existing matches.
		2.Uses two nested loops to pair each player with every other player once(no repeats, no self matches)
		3.Each match is stored as a pair [player1, player2] in the matches array.*/
	generateMatches() {
		this.matches = [];
		
		const playerArray = Array.from(this.players);
		for (let i = 0; i < playerArray.length; i++) {
			for (let j = i + 1; j < playerArray.length; j++) {
				this.matches.push([playerArray[i], playerArray[j]]);
			}
		}
		this.currentMatchIndex = 0;
		this.currentMatch = this.matches > 0 ? this.matches[0] : null; //avoid seeting 
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
		this.players = new Set();
		this.matches = [];
		this.currentMatchIndex = 0;
		this.currentMatch = null;
	}
}

export default Tournament;