export function removeOverlays() {
	document.querySelectorAll('.game-overlay').forEach(el => el.remove());
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
			if (options.confirmText === "I'm Ready") {
				// Socket will be passed from parent
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

