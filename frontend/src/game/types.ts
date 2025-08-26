//Game State Interfaces

export interface PaddleState {
	y: number;
	height: number;
	width: number;
}

export interface BallState {
	x: number;
	y: number;
	radius: number;
}

export interface GameState {
	paddles: { player1: PaddleState; player2: PaddleState };
	ball: BallState;
	score: { player1: number; player2: number };
	gameOver: boolean;
}

export interface TournamentMatch {
	player1: string | { alias: string };
	player2: string | { alias: string };
}

export interface TournamentResult {
	player1: string;
	player2: string;
	score1: number;
	score2: number;
}

export const SERVER_WIDTH = 900;
export const SERVER_HEIGHT = 600;

export function removeOverlays() {
	document.querySelectorAll('.game-overlay').forEach(el => el.remove());
	// Also hide tournament bracket if it exists
	const bracketDiv = document.getElementById('tournament-bracket');
	if (bracketDiv) bracketDiv.style.display = 'none';
}

export function showTournamentDialog(message: string, 
	options?: { confirmText?: string, timer?: number, onConfirm?: () => void }
) {
	const existing = document.querySelector('.tournament-dialog');
	if (existing) existing.remove();

	const dialog = document.createElement('div');
	dialog.className = 'tournament-dialog';

	dialog.innerHTML = `
	<div class="dialog-content">
		<p>${message}</p>
		${options?.confirmText ? 
		`<button class="confirm-btn">${options.confirmText}</button>` : 
		''}
		${options?.timer ? 
		`<div class="countdown">Starting in ${options.timer}...</div>` : 
		''}
	</div>
	`;

	if (options?.confirmText) {
		dialog.querySelector('button')!.onclick = () => {
			if (options.onConfirm) options.onConfirm();
			dialog.remove();
		};
	}

	document.body.appendChild(dialog);
	return dialog;
}