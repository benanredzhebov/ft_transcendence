/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pauseManager.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/02 00:00:00 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/09/02 20:48:16 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Socket } from 'socket.io-client';

// Pause state variables
let pauseButton: HTMLButtonElement | null = null;
let pauseOverlay: HTMLDivElement | null = null;

export interface PauseManagerState {
	gamePaused: boolean;
	gameEnded: boolean;
	countDownActive: boolean;
	matchStarted: boolean;
	inTournament: boolean;
	inLocalTournament: boolean;
}

export class PauseManager {
	private socket: Socket | null = null;
	private state: PauseManagerState;
	private onResumeCallback: (() => void) | null = null;

	constructor(socket: Socket | null = null) {
		this.socket = socket;
		this.state = {
			gamePaused: false,
			gameEnded: false,
			countDownActive: false,
			matchStarted: false,
			inTournament: false,
			inLocalTournament: false
		};
	}

	updateSocket(socket: Socket | null) {
		this.socket = socket;
	}

	updateState(newState: Partial<PauseManagerState>) {
		this.state = { ...this.state, ...newState };
	}

	getState() {
		return { ...this.state };
	}

	setOnResumeCallback(callback: (() => void) | null) {
		this.onResumeCallback = callback;
	}

	private navigateToDashboard() {
		// Proper navigation to dashboard with authentication check
		const token = sessionStorage.getItem('authToken');
		const jwtToken = localStorage.getItem('jwtToken');
		
		if (token || jwtToken) {
			// Valid session, redirect to dashboard
			window.location.href = '/dashboard';
		} else {
			// No valid session, redirect to login
			window.location.href = '/login';
		}
	}

	createPauseButton() {
		if (pauseButton) return; // Already exists

		pauseButton = document.createElement('button');
		pauseButton.className = 'pause-button';
		pauseButton.innerHTML = '⏸️';
		pauseButton.title = 'Pause Game (P key or Space)';
		
		pauseButton.addEventListener('click', () => {
			if (!this.state.gamePaused) {
				this.pauseGame();
			}
		});

		document.body.appendChild(pauseButton);
	}

	removePauseButton() {
		if (pauseButton) {
			pauseButton.remove();
			pauseButton = null;
		}
	}

	pauseGame() {
		if (this.state.gamePaused || this.state.gameEnded || this.state.countDownActive) return;

		this.state.gamePaused = true;
		
		// Emit pause based on game mode
		if (this.state.inLocalTournament) {
			this.socket?.emit('local_tournament_pause');
		} else if (this.state.inTournament) {
			this.socket?.emit('tournament_pause');
		} else {
			this.socket?.emit('pause_game');
		}
		
		this.showPauseOverlay();
	}

	resumeGame() {
		if (!this.state.gamePaused) return;

		this.state.gamePaused = false;
		
		// Emit resume based on game mode
		if (this.state.inLocalTournament) {
			this.socket?.emit('local_tournament_resume');
		} else if (this.state.inTournament) {
			this.socket?.emit('tournament_resume');
		} else {
			this.socket?.emit('resume_game');
		}
		
		this.hidePauseOverlay();
		
		// Call the resume callback to restore game controls
		if (this.onResumeCallback) {
			this.onResumeCallback();
		}
	}

	private showPauseOverlay() {
		if (pauseOverlay) return; // Already showing

		pauseOverlay = document.createElement('div');
		pauseOverlay.className = 'pause-overlay';
		
		pauseOverlay.innerHTML = `
			<div class="pause-content">
				<h2 class="pause-title">PAUSED</h2>
				<p class="pause-subtitle">Game is paused</p>
				<div class="pause-buttons">
					<button class="resume-btn" id="resume-btn">
						<span>▶️</span> Resume Game
					</button>
					<button class="dashboard-btn" id="back-dashboard-btn">
						<span>🏠</span> Back to Dashboard
					</button>
				</div>
			</div>
		`;

		// Add event listeners
		const resumeBtn = pauseOverlay.querySelector('#resume-btn') as HTMLButtonElement;
		const dashboardBtn = pauseOverlay.querySelector('#back-dashboard-btn') as HTMLButtonElement;

		resumeBtn?.addEventListener('click', () => {
			this.resumeGame();
		});

		dashboardBtn?.addEventListener('click', () => {
			// Navigate back to dashboard with proper authentication check
			this.navigateToDashboard();
		});

		document.body.appendChild(pauseOverlay);
	}

	hidePauseOverlay() {
		if (pauseOverlay) {
			pauseOverlay.remove();
			pauseOverlay = null;
		}
	}

	setupPauseHandlers() {
		if (!this.socket) return;

		// Regular game pause/resume handlers
		this.socket.on('game_paused', () => {
			this.state.gamePaused = true;
			this.showPauseOverlay();
		});

		this.socket.on('game_resumed', () => {
			this.state.gamePaused = false;
			this.hidePauseOverlay();
			// Call the resume callback to restore game controls
			if (this.onResumeCallback) {
				this.onResumeCallback();
			}
		});

		// Remote tournament pause/resume handlers
		this.socket.on('tournament_paused', () => {
			this.state.gamePaused = true;
			this.showPauseOverlay();
		});

		this.socket.on('tournament_resumed', () => {
			this.state.gamePaused = false;
			this.hidePauseOverlay();
			// Call the resume callback to restore game controls
			if (this.onResumeCallback) {
				this.onResumeCallback();
			}
		});

		// Local tournament pause/resume handlers
		this.socket.on('local_tournament_paused', () => {
			this.state.gamePaused = true;
			this.showPauseOverlay();
		});

		this.socket.on('local_tournament_resumed', () => {
			this.state.gamePaused = false;
			this.hidePauseOverlay();
			// Call the resume callback to restore game controls
			if (this.onResumeCallback) {
				this.onResumeCallback();
			}
		});
	}

	cleanup() {
		this.removePauseButton();
		this.hidePauseOverlay();
		this.state.gamePaused = false;
	}

	// Handle keyboard input for pause functionality
	handleKeyDown(e: KeyboardEvent): boolean {
		// Handle pause key (P or Space) - only when match has started and not in countdown
		if ((e.key.toLowerCase() === 'p' || e.key === ' ') && this.state.matchStarted && !this.state.countDownActive) {
			e.preventDefault(); // Prevent space from scrolling
			if (!this.state.gamePaused) {
				this.pauseGame();
			} else {
				this.resumeGame();
			}
			return true; // Indicates the key was handled
		}
		
		// Handle Escape key to show pause menu when paused
		if (e.key === 'Escape' && this.state.gamePaused) {
			this.showPauseOverlay();
			return true; // Indicates the key was handled
		}

		return false; // Key was not handled
	}
}
