/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LocalTournamentMode.js                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/08/18 18:00:00 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/08/18 20:39:08 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import GameEngine from './GameEngine.js';

class LocalTournamentMode {
    constructor(socketId) {
        this.socketId = socketId;
        this.players = new Map(); // alias -> { alias, id }
        this.rounds = [];
        this.currentRound = 0;
        this.currentMatchIndex = 0;
        this.currentMatch = null;
        this.gameEngine = null;
        this.isActive = false;
        this.tournamentWinner = null;
        this.isFinished = false;
    }

    // Register a player with an alias
    registerPlayer(alias) {
        // Check if alias is already taken
        if (this.players.has(alias)) {
            return { success: false, message: 'Alias already taken. Please try another name.' };
        }

        const playerId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.players.set(alias, {
            alias,
            id: playerId
        });

        return { success: true };
    }

    // Get all registered players
    getPlayers() {
        return Array.from(this.players.values());
    }

    // Check if we have enough players to start (minimum 4)
    canStartTournament() {
        return this.players.size >= 4;
    }

    // Generate tournament bracket
    generateBracket() {
        if (!this.canStartTournament()) {
            throw new Error('Need at least 4 players to start tournament');
        }

        // Convert players map to array and shuffle for randomness
        const playersArray = Array.from(this.players.values());
        const shuffledPlayers = playersArray.sort(() => Math.random() - 0.5);
        
        // Create first round matches
        const firstRound = [];
        
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            if (i + 1 < shuffledPlayers.length) {
                // Normal match
                firstRound.push({
                    player1: shuffledPlayers[i].alias,
                    player2: shuffledPlayers[i + 1].alias,
                    winner: null,
                    scores: null,
                    isComplete: false,
                    isCurrent: false,
                    isBye: false
                });
            } else {
                // Bye match (odd number of players)
                firstRound.push({
                    player1: shuffledPlayers[i].alias,
                    player2: null,
                    winner: shuffledPlayers[i].alias,
                    scores: { player1: 0, player2: 0 },
                    isComplete: true,
                    isCurrent: false,
                    isBye: true
                });
            }
        }

        this.rounds = [firstRound];
        this.generateSubsequentRounds();
        this.setCurrentMatch();
        this.isActive = true;
    }

    // Generate all subsequent rounds based on first round
    generateSubsequentRounds() {
        let currentRound = this.rounds[0];
        
        while (currentRound.length > 1) {
            const nextRound = [];
            
            for (let i = 0; i < currentRound.length; i += 2) {
                if (i + 1 < currentRound.length) {
                    nextRound.push({
                        player1: null,  // Will be filled by winners
                        player2: null,  // Will be filled by winners
                        winner: null,
                        scores: null,
                        isComplete: false,
                        isCurrent: false,
                        isBye: false
                    });
                }
            }
            
            if (nextRound.length > 0) {
                this.rounds.push(nextRound);
            }
            currentRound = nextRound;
        }
    }

    // Set the first non-bye match as current
    setCurrentMatch() {
        const firstRound = this.rounds[0];
        const firstNonByeMatch = firstRound.find(match => !match.isBye);
        if (firstNonByeMatch) {
            firstNonByeMatch.isCurrent = true;
            this.currentMatch = firstNonByeMatch;
        }
        this.currentRound = 0;
        this.currentMatchIndex = firstRound.findIndex(match => match.isCurrent);
    }

    // Get current match
    getCurrentMatch() {
        return this.currentMatch;
    }

    // Start the current match - create game engine
    startCurrentMatch() {
        if (!this.currentMatch || this.currentMatch.isBye) {
            return { success: false, message: 'No valid match to start' };
        }

        // Create new game engine for this match
        this.gameEngine = new GameEngine();
        this.gameEngine.isTournament = false; // Use local match logic
        
        // Add the socket as both players (local match style)
        this.gameEngine.addPlayer(this.socketId);
        
        return { 
            success: true, 
            match: this.currentMatch,
            gameState: this.gameEngine.getGameState()
        };
    }

    // Handle player movement
    movePlayer(playerId, direction) {
        if (this.gameEngine) {
            this.gameEngine.movePlayer(this.socketId, playerId, direction);
            return this.gameEngine.getGameState();
        }
        return null;
    }

    // Update game state
    updateGame() {
        if (this.gameEngine) {
            this.gameEngine.update();
            const state = this.gameEngine.getGameState();
            
            // Check if match ended
            if (state.gameOver) {
                this.endCurrentMatch();
            }
            
            return state;
        }
        return null;
    }

    // End current match and advance tournament
    endCurrentMatch() {
        if (!this.gameEngine || !this.currentMatch) return;

        const finalState = this.gameEngine.getGameState();
        const winner = finalState.score.player1 > finalState.score.player2 ? 
            this.currentMatch.player1 : this.currentMatch.player2;

        // Complete current match
        this.currentMatch.winner = winner;
        this.currentMatch.scores = finalState.score;
        this.currentMatch.isComplete = true;
        this.currentMatch.isCurrent = false;

        // Clean up game engine
        this.gameEngine = null;

        // Advance winner to next round
        this.advanceWinnerToNextRound(winner);

        // Find next match
        this.findAndSetNextMatch();

        // Check if tournament is finished
        this.checkTournamentComplete();

        return {
            matchComplete: true,
            winner,
            scores: finalState.score,
            tournamentComplete: this.isFinished,
            tournamentWinner: this.tournamentWinner
        };
    }

    // Advance winner to next round
    advanceWinnerToNextRound(winner) {
        const nextRoundIndex = this.currentRound + 1;
        
        if (nextRoundIndex >= this.rounds.length) return;

        const nextRound = this.rounds[nextRoundIndex];
        
        // Calculate which next round match this winner goes to
        const nextMatchIndex = Math.floor(this.currentMatchIndex / 2);
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
        const currentRound = this.rounds[this.currentRound];
        const nextMatchInRound = currentRound.find((match, index) => 
            !match.isComplete && !match.isBye && index > this.currentMatchIndex
        );
        
        if (nextMatchInRound && nextMatchInRound.player1 && nextMatchInRound.player2) {
            nextMatchInRound.isCurrent = true;
            this.currentMatch = nextMatchInRound;
            this.currentMatchIndex = currentRound.findIndex(match => match.isCurrent);
            return;
        }

        // Move to next round if current round is complete
        if (currentRound.every(match => match.isComplete)) {
            this.currentRound++;
            this.currentMatchIndex = 0;
            
            if (this.currentRound < this.rounds.length) {
                const nextRound = this.rounds[this.currentRound];
                const nextMatch = nextRound.find(match => 
                    !match.isComplete && match.player1 && match.player2
                );
                
                if (nextMatch) {
                    nextMatch.isCurrent = true;
                    this.currentMatch = nextMatch;
                    this.currentMatchIndex = nextRound.findIndex(match => match.isCurrent);
                }
            }
        }
    }

    // Check if tournament is complete
    checkTournamentComplete() {
        const finalRound = this.rounds[this.rounds.length - 1];
        if (finalRound.length === 1 && finalRound[0].isComplete) {
            this.isFinished = true;
            this.tournamentWinner = finalRound[0].winner;
            this.isActive = false;
        }
    }

    // Get current tournament state
    getTournamentState() {
        return {
            players: this.getPlayers(),
            rounds: this.rounds,
            currentRound: this.currentRound,
            currentMatch: this.currentMatch,
            isActive: this.isActive,
            isFinished: this.isFinished,
            tournamentWinner: this.tournamentWinner
        };
    }

    // Reset tournament
    reset() {
        this.players.clear();
        this.rounds = [];
        this.currentRound = 0;
        this.currentMatchIndex = 0;
        this.currentMatch = null;
        this.gameEngine = null;
        this.isActive = false;
        this.tournamentWinner = null;
        this.isFinished = false;
    }

    // Clean up resources
    cleanup() {
        if (this.gameEngine) {
            this.gameEngine.cleanup?.();
            this.gameEngine = null;
        }
        this.reset();
    }
}

export default LocalTournamentMode;
