import './showUserModal.css';

export async function showUserProfileModal(userId: number, onActionComplete: () => void) {
  const token = sessionStorage.getItem('authToken');
  if (!token) return;

  // Create modal structure
  const overlay = document.createElement('div');
  overlay.className = 'profile-view-modal-overlay';

  const content = document.createElement('div');
  content.className = 'profile-view-modal-content';
  // content.innerHTML = '<p>Loading profile...</p>';

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  try {
    // Fetch 2 data tables
    const [profileResponse, statusResponse] = await Promise.all([
      fetch(`/api/profile/public/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/friends/status/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (!profileResponse.ok) {
      const err = await profileResponse.json();
      throw new Error(err.message || 'Could not fetch profile.');
    }

    const profile = await profileResponse.json();
    const friendship = statusResponse.ok ? await statusResponse.json() : { status: 'none' };

    let matchHistoryHtml = '<div class="match-history-container-modal"><p>No match history found.</p></div>';
    if (profile.matches && profile.matches.length > 0) {
      matchHistoryHtml = `
        <div class="match-history-container-modal">
          <ul class="match-history-list-modal">
            ${profile.matches.map((match: any) => {
              const isWinner = match.winner_id === profile.userId;
              const resultClass = isWinner ? 'win' : 'loss';
              const resultText = isWinner ? 'Win' : 'Loss';
              return `
                <li>
                  <span>${match.player1_username} vs ${match.player2_username} (${match.player1_score}-${match.player2_score})</span>
                  <strong class="${resultClass}">${resultText}</strong>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      `;
    }

    let friendButtonHtml = '';
    if (friendship.status === 'accepted') {
      // If they are friends, show a "Delete Friend" button
      friendButtonHtml = `<button id="delete-friend-btn" class="profile-view-modal-action-button delete">Delete Friend</button>`;
    } else {
      // Otherwise, show the "Add Friend" button
      friendButtonHtml = `<button id="add-friend-btn" class="profile-view-modal-action-button">Add Friend</button>`;
    }

    content.innerHTML = `
      <img src="${profile.avatar || '/avatars/default.png'}" alt="${profile.username}'s Avatar" class="profile-view-modal-avatar">
      <h3>${profile.username}</h3>
      <div class="profile-view-modal-actions">
        ${friendButtonHtml}
      </div>
      <div class="profile-view-modal-section">
        ${matchHistoryHtml}
      </div>
    `;

    const modal = document.getElementById('profile-view-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

    // The modal can still be closed by clicking the overlay, so this button is removed per your request.
    // content.querySelector('.profile-view-modal-close-button')?.addEventListener('click', closeModal);

    // Event listener for the new "Delete Friend" button
    const deleteFriendBtn = content.querySelector<HTMLButtonElement>('#delete-friend-btn');
    if (deleteFriendBtn) {
      deleteFriendBtn.addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to remove ${profile.username} as a friend?`)) {
          return;
        }
        deleteFriendBtn.disabled = true;
        deleteFriendBtn.textContent = 'Deleting...';
        try {
          const res = await fetch('/api/friends/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ friendId: userId })
          });

          if (res.ok) {
            closeModal();
            // Refresh the main profile view by calling the callback
            onActionComplete();
          } else {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete friend.');
          }
        } catch (e: any) {
          alert(`Error: ${e.message}`);
          deleteFriendBtn.disabled = false;
          deleteFriendBtn.textContent = 'Delete Friend';
        }
      });
    }

    const addFriendBtn = content.querySelector<HTMLButtonElement>('#add-friend-btn');
    if (addFriendBtn) {
      addFriendBtn.addEventListener('click', async () => {
        addFriendBtn.disabled = true;
        addFriendBtn.textContent = 'Adding...';
        try {
          const res = await fetch('/api/friends/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ friendId: userId })
          });
          if (res.ok) {
            addFriendBtn.textContent = 'Friend Added';
            addFriendBtn.disabled = true; // Keep it disabled to prevent multiple adds

            // Refresh the profile view by calling the callback
            closeModal();
            onActionComplete();
            console.log("***Refreshing via callback");
          } else {
            const err = await res.json();
            addFriendBtn.textContent = err.error || 'Error';
            // Optionally re-enable the button if the error is recoverable
            // addFriendBtn.disabled = false; 
          }
        } catch (e) {
          addFriendBtn.textContent = 'Error';
          // addFriendBtn.disabled = false;
        }
      });
    }
    } catch (error: any) {
    console.error('Failed to fetch public profile:', error);
    content.innerHTML = `<p>Error: ${error.message}</p><button class="profile-view-modal-close-button">Close</button>`;
    content.querySelector('.profile-view-modal-close-button')?.addEventListener('click', closeModal);
  }
}