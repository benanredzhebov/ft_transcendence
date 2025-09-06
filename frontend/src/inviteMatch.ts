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

  // Prevent XSS
  const header = document.createElement('div');
  header.className = 'dashboard-lobby-invite-header';
  header.innerHTML = `<div class="loading"></div>`;

  const textContainer = document.createElement('div');
  const title = document.createElement('h4');
  title.textContent = 'Match Invitation';

  const paragraph = document.createElement('p');
  const aliasStrong = document.createElement('strong');
  aliasStrong.textContent = senderAlias; // Sets the alias text

  paragraph.appendChild(aliasStrong);
  paragraph.append(' invited you to join a Match Lobby!');

  textContainer.appendChild(title);
  textContainer.appendChild(paragraph);
  header.appendChild(textContainer);

  const actions = document.createElement('div');
  actions.className = 'dashboard-lobby-invite-actions';
  actions.innerHTML = `
    <button class="dashboard-lobby-join-btn">Join Lobby</button>
    <button class="dashboard-lobby-dismiss-btn">Dismiss</button>
  `;

  card.appendChild(header);
  card.appendChild(actions);

  overlay.appendChild(card);
  document.body.appendChild(overlay);



  // Join button
  card.querySelector('.dashboard-lobby-join-btn')?.addEventListener('click', () => {
	overlay.remove();
    if (chatSocket && senderSocketId) {
      chatSocket.emit('accept_lobby_invite', { senderSocketId });
    }
    navigateTo('/game?tournament=true');
  });



  // Dismiss button
  card.querySelector('.dashboard-lobby-dismiss-btn')?.addEventListener('click', () => {
    overlay.remove();
    // Emit dismiss event to backend, include senderSocketId if available
    if (chatSocket && senderSocketId) {
      chatSocket.emit('dismiss_lobby_invite', { senderSocketId });
    }
  });


  // Click outside to dismiss
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}