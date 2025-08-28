import { Socket } from "socket.io-client";

export function removeOverlays() {
	document.querySelectorAll('.game-overlay').forEach(el => el.remove());
	const bracketDiv = document.getElementById('tournament-bracket');
	if (bracketDiv) bracketDiv.style.display = 'none';
}

export function showTournamentDialog(
	message: string, 
	options?: { confirmText?: string, timer?: number, onConfirm?: () => void },
	socket?: Socket | null
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
			if (options.confirmText === "I'm Ready") {
				socket?.emit('player_ready');
			}
			if (options.onConfirm) options.onConfirm();
			dialog.remove();
		};
	}

	document.body.appendChild(dialog);
	return dialog;
}

export function showMatchInfo(
	player1: string | { alias:string },
	player2: string | { alias:string },
	score1: number,
	score2: number
) {
	const p1 = typeof player1 === 'object' && player1 !== null ? player1.alias : player1;
	const p2 = typeof player2 === 'object' && player2 !== null ? player2.alias : player2;
	
	const existing = document.getElementById('match-info-box');
	if (existing) {
		existing.innerHTML = `
			<div><strong>${p1}</strong> vs <strong>${p2}</strong></div>
			<div style="text-align: center; margin-top: 4px; font-size: 20px;">
			${score1} : ${score2}
			</div>
		`;
		return;
	}

	const box = document.createElement('div');
	box.id = 'match-info-box';
	box.className = 'match-info-box';

	box.innerHTML = `
	<div><strong>${p1}</strong> vs <strong>${p2}</strong></div>
	<div style="text-align: center; margin-top: 4px; font-size: 20px;">
		${score1} : ${score2}
	</div>
	`;

	document.body.appendChild(box);
}

export function showTournamentResults(winnerName: string, allMatches?: string[], socket?: Socket | null) {
	removeOverlays();

	// Debug: log the results before rendering
	// console.log('Tournament Results:', tournamentResults);

	const overlay = document.createElement('div');
	overlay.className = 'game-overlay';

	const message = document.createElement('div');
	message.className = 'game-message';
	message.innerHTML = `<h2>🏆 Tournament Champion: ${winnerName}</h2>`;

	// Show all match results if provided
	if (allMatches && allMatches.length > 0) {
		const matchResultsDiv = document.createElement('div');
		matchResultsDiv.id = 'all-match-results';
		matchResultsDiv.innerHTML = '<h3>Complete Tournament Results</h3>';
		
		const resultsList = document.createElement('div');
		resultsList.className = 'match-results-list';
		
		allMatches.forEach(matchResult => {
			const matchDiv = document.createElement('div');
			matchDiv.className = 'match-result-item';
			matchDiv.textContent = matchResult;
			resultsList.appendChild(matchDiv);
		});
		
		matchResultsDiv.appendChild(resultsList);
		overlay.appendChild(matchResultsDiv);
	}

	const dashboardBtn = document.createElement('button');
	dashboardBtn.textContent = 'Back to Dashboard';
	dashboardBtn.onclick = () => {
		// Disconnect socket and reload to ensure clean state on dashboard
		if (socket) {
			socket.disconnect();
			// socket = null;
		}
		
		// Check authentication before redirecting
		const token = sessionStorage.getItem('authToken');
		if (!token) {
			alert('Your session has expired. Please log in again.');
			window.location.href = '/login';
		} else {
			window.location.href = '/dashboard';
		}
	};

	overlay.appendChild(message);
	overlay.appendChild(dashboardBtn);

	document.body.appendChild(overlay);
}