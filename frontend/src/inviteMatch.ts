import { Socket } from 'socket.io-client';
import './dashboard.css'
import { navigateTo } from './main';

export function showLobbyInviteCard(senderAlias: string, senderSocketId?: string, chatSocket?: Socket) {
  // Remove any previous invite
  document.querySelectorAll('.dashboard-lobby-invite-card').forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'dashboard-lobby-invite-overlay';

  const card = document.createElement('div');
  card.className = 'dashboard-lobby-invite-card';

  card.innerHTML = `
    <div class="dashboard-lobby-invite-header">
      <div class="loading"></div>
      <div>
        <h4>Match Invitation</h4>
        <p><strong>${senderAlias}</strong> invited you to join a Match Lobby!</p>
      </div>
    </div>
    <div class="dashboard-lobby-invite-actions">
      <button class="dashboard-lobby-join-btn">Join Lobby</button>
      <button class="dashboard-lobby-dismiss-btn">Dismiss</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Join button
  card.querySelector('.dashboard-lobby-join-btn')?.addEventListener('click', () => {
    // window.location.href = '/game?tournament=true';
    navigateTo('/game?tournament=true'); // *** ISSUE starting match ***
  });

  // Dismiss button
  card.querySelector('.dashboard-lobby-dismiss-btn')?.addEventListener('click', () => {
    overlay.remove();
    // Emit dismiss event to backend, include senderSocketId if available
    if (chatSocket && senderSocketId) {
      chatSocket.emit('dismiss_lobby_invite', { senderSocketId });
    }
  });

  // Remove on overlay click (optional)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}