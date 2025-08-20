/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LocalTournament.js                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/08/18 00:00:00 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/08/19 20:54:27 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

class LocalTournamentManager {
    constructor() {
        this.players = [];
        this.isStarted = false; // Flag to prevent multiple starts
        this.bracket = {
            rounds: [],
            currentRound: 0,
            isFinished: false,
            tournamentWinner: null
        };
    }

    // Register a player with an alias
    registerPlayer(alias) {
        if (this.players.find(p => p.alias === alias)) {
            return { success: false, message: 'Alias already taken. Please try another name.' };
        }
        
        const player = {
            alias,
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        this.players.push(player);
        return { success: true };
    }

    // Get all registered players
    getPlayers() {
        return [...this.players];
    }

    // Check if we have enough players to start (minimum 4)
    canStartTournament() {
        return this.players.length >= 4;
    }

    // Generate tournament bracket
    generateBracket() {
        if (!this.canStartTournament()) {
            throw new Error('Need at least 4 players to start tournament');
        }

        // Shuffle players for randomness
        const shuffledPlayers = [...this.players].sort(() => Math.random() - 0.5);
        
        // Create first round matches
        const firstRound = [];
        
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            if (i + 1 < shuffledPlayers.length) {
                // Normal match
                firstRound.push({
                    player1: shuffledPlayers[i].alias,
                    player2: shuffledPlayers[i + 1].alias,
                    isComplete: false,
                    isCurrent: false,
                    isBye: false
                });
            } else {
                // Bye match (odd number of players)
                firstRound.push({
                    player1: shuffledPlayers[i].alias,
                    player2: '',
                    winner: shuffledPlayers[i].alias,
                    isComplete: true,
                    isCurrent: false,
                    isBye: true
                });
            }
        }

        this.bracket.rounds = [firstRound];
        this.generateSubsequentRounds();
        this.setCurrentMatch();
    }

    // Generate all subsequent rounds based on first round
    generateSubsequentRounds() {
        let currentRound = this.bracket.rounds[0];
        let roundIndex = 1;

        while (currentRound.length > 1) {
            const nextRound = [];
            
            for (let i = 0; i < currentRound.length; i += 2) {
                if (i + 1 < currentRound.length) {
                    nextRound.push({
                        player1: '',  // Will be filled by winners
                        player2: '',  // Will be filled by winners
                        isComplete: false,
                        isCurrent: false,
                        isBye: false
                    });
                }
            }
            
            if (nextRound.length > 0) {
                this.bracket.rounds.push(nextRound);
            }
            currentRound = nextRound;
            roundIndex++;
        }
    }

    // Set the first non-bye match as current
    setCurrentMatch() {
        const firstRound = this.bracket.rounds[0];
        const firstNonByeMatch = firstRound.find(match => !match.isBye);
        if (firstNonByeMatch) {
            firstNonByeMatch.isCurrent = true;
        }
        this.bracket.currentRound = 0;
    }

    // Get current match
    getCurrentMatch() {
        for (const round of this.bracket.rounds) {
            const currentMatch = round.find(match => match.isCurrent);
            if (currentMatch) {
                return currentMatch;
            }
        }
        return null;
    }

    // Complete current match and advance to next
    completeMatch(winner, scores) {
        const currentMatch = this.getCurrentMatch();
        if (!currentMatch) return;

        // Complete current match
        currentMatch.winner = winner;
        currentMatch.scores = scores;
        currentMatch.isComplete = true;
        currentMatch.isCurrent = false;

        // Advance winner to next round
        this.advanceWinnerToNextRound(winner);

        // Find next match
        this.findAndSetNextMatch();

        // Check if tournament is finished
        this.checkTournamentComplete();
    }

    // Advance winner to next round
    advanceWinnerToNextRound(winner) {
        const currentRoundIndex = this.bracket.currentRound;
        const nextRoundIndex = currentRoundIndex + 1;
        
        if (nextRoundIndex >= this.bracket.rounds.length) return;

        const currentRound = this.bracket.rounds[currentRoundIndex];
        const nextRound = this.bracket.rounds[nextRoundIndex];
        
        // Find which match the winner came from
        const completedMatchIndex = currentRound.findIndex(match => 
            match.winner === winner && match.isComplete
        );
        
        if (completedMatchIndex === -1) return;

        // Calculate which next round match this winner goes to
        const nextMatchIndex = Math.floor(completedMatchIndex / 2);
        const nextMatch = nextRound[nextMatchIndex];
        
        if (!nextMatch) return;

        // Place winner in appropriate slot
        if (!nextMatch.player1) {
            nextMatch.player1 = winner;
        } else if (!nextMatch.player2) {
            nextMatch.player2 = winner;
        }
    }

    // Find and set the next match to be played
    findAndSetNextMatch() {
        // First check current round for incomplete matches
        const currentRound = this.bracket.rounds[this.bracket.currentRound];
        const nextMatchInRound = currentRound.find(match => !match.isComplete && !match.isBye);
        
        if (nextMatchInRound && nextMatchInRound.player1 && nextMatchInRound.player2) {
            nextMatchInRound.isCurrent = true;
            return;
        }

        // Move to next round if current round is complete
        if (currentRound.every(match => match.isComplete)) {
            this.bracket.currentRound++;
            
            if (this.bracket.currentRound < this.bracket.rounds.length) {
                const nextRound = this.bracket.rounds[this.bracket.currentRound];
                const nextMatch = nextRound.find(match => 
                    !match.isComplete && match.player1 && match.player2
                );
                
                if (nextMatch) {
                    nextMatch.isCurrent = true;
                }
            }
        }
    }

    // Check if tournament is complete
    checkTournamentComplete() {
        const finalRound = this.bracket.rounds[this.bracket.rounds.length - 1];
        if (finalRound.length === 1 && finalRound[0].isComplete) {
            this.bracket.isFinished = true;
            this.bracket.tournamentWinner = finalRound[0].winner || null;
        }
    }

    // Get current bracket state
    getBracket() {
        return { ...this.bracket };
    }

    // Reset tournament
    reset() {
        this.players = [];
        this.bracket = {
            rounds: [],
            currentRound: 0,
            isFinished: false,
            tournamentWinner: null
        };
    }
}

export default LocalTournamentManager;
