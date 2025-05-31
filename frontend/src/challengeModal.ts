import { getSocket } from './socketManager';
import './dashboard.css';

export function displayChallengeModal(challengerUsername: string, challengerSocketId: string, ownSocketId: string | null, currentOwnUsername: string | null) {
  const existingModal = document.getElementById('challenge-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'challenge-modal';
  modal.className = 'challenge-modal';

  const modalContent = document.createElement('div');
  modalContent.className = 'challenge-modal-content';

  const message = document.createElement('p');
  message.textContent = `${challengerUsername} has challenged you to a game!`;

  const acceptButton = document.createElement('button');
  acceptButton.textContent = 'Accept';
  acceptButton.className = 'challenge-modal-button accept';
  acceptButton.onclick = () => {
    const socket = getSocket();
    if (socket && ownSocketId) {
      socket.emit('accept_challenge', {
        challengerSocketId: challengerSocketId,
        challengedSocketId: ownSocketId
      });
    }
    modal.remove();
  };

  const rejectButton = document.createElement('button');
  rejectButton.textContent = 'Reject';
  rejectButton.className = 'challenge-modal-button reject';
  rejectButton.onclick = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('reject_challenge', {
        challengerSocketId: challengerSocketId,
        challengedUsername: currentOwnUsername || 'Player'
      });
    }
    modal.remove();
  };

  modalContent.appendChild(message);
  modalContent.appendChild(acceptButton);
  modalContent.appendChild(rejectButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}