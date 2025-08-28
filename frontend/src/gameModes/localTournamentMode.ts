// import { Socket } from 'socket.io-client';
// import { showTournamentDialog, removeOverlays } from '../game/uiHelpers';

// export class LocalTournamentMode {
//     private socket: Socket | null = null;
//     public inLocalTournament = false;
//     public currentMatch: [string | { alias: string }, string | { alias: string }] | null = null;

//     constructor(socket: Socket) {
//         this.socket = socket;
//         this.setupHandlers();
//     }

//     promptLocalTournamentSetup() {
//         const dialog = document.createElement('div');
//         dialog.className = 'tournament-dialog';
        
//         dialog.innerHTML = `
//             <div class="dialog-content">
//                 <h3>Local Tournament Setup</h3>
//                 <p>Enter player names (2-8 players):</p>
//                 <div class="player-inputs">
//                     <input type="text" placeholder="Player 1" class="player-name-input" />
//                     <input type="text" placeholder="Player 2" class="player-name-input" />
//                 </div>
//                 <div class="buttons">
//                     <button class="add-player-btn">Add Player</button>
//                     <button class="start-tournament-btn">Start Tournament</button>
//                     <button class="cancel-btn">Cancel</button>
//                 </div>
//             </div>
//         `;
        
//         // ... rest of setup dialog implementation
//     }

//     private setupHandlers() {
//         if (!this.socket) return;
        
//         this.socket.on('local_tournament_initialized', (status) => {
//             document.querySelectorAll('.tournament-dialog').forEach(el => el.remove());
//             this.showLocalTournamentBracket(status);
//             this.showLocalTournamentMatchDialog(status);
//         });
        
//         // Add all other local tournament handlers
//     }

//     private showLocalTournamentBracket(status: any) {
//         // ... bracket display implementation
//     }

//     public cleanup() {
//         this.inLocalTournament = false;
//         this.currentMatch = null;
//     }
// }