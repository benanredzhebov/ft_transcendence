import './dashboard.css';
import { navigateTo } from './main';
import { openAvatarSelectionModal } from './avatarModal';
import { profileEdit } from './profileEdit'; // Import the new modal function
import { io, Socket } from 'socket.io-client';
import { renderChat } from './chat';
let chatSocket: Socket | null = null; // module-level variable for the chat socket
let onlineUserCache: OnlineUser[] = []; // Cache for online users

// Define a type for online users for better type safety
type OnlineUser = {
  socketId: string;
  userId: number;
  username: string;
  alias: string;
};

export function renderDashboard() {
  const appElement = document.querySelector<HTMLDivElement>('#app');
  if (!appElement) {
    throw new Error('App root element (#app) not found!');
  }

  // Clear previous content
  appElement.innerHTML = '';

  // Global Container
  const globalContainer = document.createElement('div');
  globalContainer.className = "dashboard-global-container";

  // Card Container
  const cardContainer = document.createElement('div');
  cardContainer.className = "dashboard-card-container";

  // Left Sidebar
  const sidebar = document.createElement('div');
  sidebar.className = "dashboard-sidebar";

  const sidebarHeading = document.createElement('h2');
  sidebarHeading.className = "dashboard-heading";
  sidebarHeading.textContent = "Dashboard";

  const nav = document.createElement('nav');
  nav.className = "dashboard-nav";

  // Navigation Buttons
  const profileButton = document.createElement('button');
  profileButton.className = "dashboard-nav-button";
  profileButton.textContent = "Profile";
  profileButton.dataset.view = "profile"; // Custom data attribute to identify view

  const gameButton = document.createElement('button');
  gameButton.className = "dashboard-nav-button";
  gameButton.textContent = "Game";
  gameButton.dataset.view = "game";

  const chatButton = document.createElement('button');
  chatButton.className = "dashboard-nav-button";
  chatButton.textContent = "Chat";
  chatButton.dataset.view = "chat";

  // Logout Button
  const logoutButton = document.createElement('button');
  logoutButton.className = "dashboard-logout-button";
  logoutButton.textContent = "Logout";

  // Right Content Area
  const contentArea = document.createElement('div');
  contentArea.className = "dashboard-content-area";
  contentArea.id = "dashboard-content"; // ID to easily update content

  // --- Assemble Sidebar ---
  nav.appendChild(profileButton);
  nav.appendChild(gameButton);
  nav.appendChild(chatButton);

  sidebar.appendChild(sidebarHeading);
  sidebar.appendChild(nav);
  sidebar.appendChild(logoutButton);

  // --- Assemble Card ---
  cardContainer.appendChild(sidebar);
  cardContainer.appendChild(contentArea);

  // --- Assemble Global Container ---
  globalContainer.appendChild(cardContainer);

  // --- Append to App ---
  appElement.appendChild(globalContainer);

  // --- SOCKET Chat Connection ---
  const token = sessionStorage.getItem('authToken');
  if (token && (!chatSocket || !chatSocket.connected)) {
    if (chatSocket) {
      chatSocket.disconnect(); // Disconnect any old socket
    }
    chatSocket = io(`${import.meta.env.VITE_URL}`, {
      transports: ['websocket'],
      secure: true,
    });

    chatSocket.on('connect', () => {
      console.log('%cDEBUG: Session socket connected:', chatSocket?.id);
      chatSocket?.emit('authenticate_chat', token);
    });

    chatSocket.on('disconnect', () => {
      console.log('%cDEBUG: Session socket disconnected.');
      const list = document.getElementById('online-users-list');
      if (list) {
        list.innerHTML = '<li>Disconnected</li>';
      }
    });

    // Listen for the list of online users and populate the sidebar
    chatSocket.on('online_users', (users: OnlineUser[]) => {
      onlineUserCache = users; // Update the cache
      console.log('Received online users:', users); // Debug log
      const list = document.getElementById('online-users-list');
      if (list) {
        list.innerHTML = ''; // Clear current list
        if (users.length > 0) {
          users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'online-user-item';
            li.dataset.userId = String(user.userId);
            li.textContent = user.username;

            li.addEventListener('click', () => {
              // Directly open the profile modal instead of showing a popup.
              showUserProfileModal(user.userId);
            });

            list.appendChild(li);
          });
        } else {
          list.innerHTML = '<li>No users online</li>';
        }
      } else {
        console.log('online-users-list element not found'); // Debug log
      }
    });
    // Close popups when clicking elsewhere
    document.addEventListener('click', () => {
        document.querySelectorAll('.user-action-popup').forEach(p => p.remove());
    });
  }

  

  // Sidebar navigation
  const navButtons = [profileButton, gameButton, chatButton];
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      if (view) {
        setActiveView(view, navButtons, contentArea);
      }
    });
  });

  // Logout button
  logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('authToken');
    if (chatSocket) {
      chatSocket.disconnect();
      chatSocket = null;
    }
    navigateTo('/');
  });

  // --- Initial View ---
  setActiveView('profile', navButtons, contentArea); // Set initial view to profile
}

async function showUserProfileModal(userId: number) {
  const token = sessionStorage.getItem('authToken');
  if (!token) return;

  // Create modal structure
  const overlay = document.createElement('div');
  overlay.className = 'profile-view-modal-overlay';

  const content = document.createElement('div');
  content.className = 'profile-view-modal-content';
  content.innerHTML = '<p>Loading profile...</p>';

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
            // Refresh the main profile view to update the friends list
            const contentArea = document.querySelector<HTMLDivElement>('#dashboard-content');
            const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.dashboard-nav-button'));
            if (contentArea && navButtons.length > 0) {
              setActiveView('profile', navButtons, contentArea);
            }
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

            // Refresh the profile view to show the new friend in the list
            const contentArea = document.querySelector<HTMLDivElement>('#dashboard-content');
            const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.dashboard-nav-button'));
            if (contentArea && navButtons.length > 0) {
                closeModal();
                setActiveView('profile', navButtons, contentArea);
                console.log("***Refreshing setActiveView");
            }
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


async function setActiveView(view: string, buttons: HTMLButtonElement[], contentArea: HTMLDivElement) {
  // Update button styles
  buttons.forEach(btn => {
    if (btn.dataset.view === view) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update content area
  contentArea.innerHTML = '';
  switch (view) {
    case 'profile':
      contentArea.innerHTML = `<h3 class="dashboard-content-heading">Profile</h3><p class="dashboard-content-paragraph">Loading profile...</p>`; // Show loading state
      // Requesh online users list when switching to profile view
      if (chatSocket && chatSocket.connected) {
        chatSocket.emit('request_online_users');
      }
      try {
        // Get the token from local storage
        const token = sessionStorage.getItem('authToken');
        if (!token) {
          contentArea.innerHTML = `
            <h3 class="dashboard-content-heading">Profile</h3>
            <p class="dashboard-content-paragraph">Error: You are not logged in or your session has expired.</p>
            <p class="dashboard-content-paragraph">Please <a href="/login">login</a> again.</p>
          `;
          return;
        }
        const response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Fetch response status:', response.status);
        console.log('Fetch response ok:', response.ok);
        const responseText = await response.clone().text(); // Clone to read text without consuming body for json()
        console.log('Fetch response text:', responseText); // ***JSON should be here

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            contentArea.innerHTML = `
              <h3 class="dashboard-content-heading">Profile</h3>
              <p class="dashboard-content-paragraph">Error: Unauthorized. Your session may have expired.</p>
              <p class="dashboard-content-paragraph">Please <a href="/login">login</a> again.</p>
              <style> .dashboard-content-paragraph a { color: #3498db; text-decoration: underline; } </style>
            `;
          } else {
			throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }
          return;
        }

        const userProfile = await response.json();

        // *** MODIFIED: Fetch all users for the list instead of online users ***
        let allUsersHtml = '<li>Loading players...</li>';
        try {
          const usersResponse = await fetch('/api/users/all', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (usersResponse.ok) {
            const allUsers = await usersResponse.json();
            const onlineUserIds = new Set(onlineUserCache.map(u => u.userId));
            const remainedUsers = allUsers.filter((user: any) => user.id !== userProfile.userId);

            if (allUsers.length > 0) {
              allUsersHtml = remainedUsers.map((user: any) => {
                const isOnline = onlineUserIds.has(user.id);
                const indicatorHtml = isOnline ? '<span class="online-indicator"></span>' : '';
                return `
                <li class="online-user-item" data-user-id="${user.id}" data-username="${user.username}">
                  ${indicatorHtml}
                  <span>${user.username}</span>
                </li>
              `;
              }).join('');
            } else {
              allUsersHtml = '<li>No players found.</li>';
            }
          } else {
            allUsersHtml = '<li>Could not load player list.</li>';
          }
        } catch (e) {
          console.error('Failed to fetch all users:', e);
          allUsersHtml = '<li>Error loading player list.</li>';
        }

        // ***new: to fetch Match Data***
        let matchHistoryHtml = '<p>Loading match history...</p>';
        try {
          const matchesResponse = await fetch('/api/profile/matches', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (matchesResponse.ok) {
            const matches = await matchesResponse.json();
            if (matches.length > 0) {
              matchHistoryHtml = `
                <div class="match-history-container">
                  <h4>Match History</h4>
                  <ul>
                    ${matches.map((match: any) => {
                      const matchType = match.is_tournament ? 'Tournament' : 'Single Match';
                      // Format the date for better readability
                      const matchDate = new Date(match.match_date).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      });
                      return `
                      <li>
                        <div class="match-info">
                          <span class="match-players">${match.player1_username} (${match.player1_score}) vs ${match.player2_username} (${match.player2_score})</span>
                          <span class="match-meta">${matchType} - ${matchDate}</span>
                        </div>
                        <strong class="${match.winner_id === userProfile.userId ? 'win' : 'loss'}">
                          ${match.winner_id === userProfile.userId ? 'Win' : 'Loss'}
                        </strong>
                      </li>
                    `;
                    }).join('')}
                  </ul>
                </div>
              `;
            } else {
              matchHistoryHtml = `
              <div class="match-history-container">
                  <h4>Match History</h4>
                  <p>No match history found.</p>
              </div>`;
            }
          } else {
            matchHistoryHtml = `
              <div class="match-history-container">
                  <h4>Match History</h4>
                  <p>Could not load match history.</p>
              </div>`;
          }
        } catch (e) {
          console.error('Failed to fetch match history:', e);
          matchHistoryHtml = '<p>Error loading match history.</p>';
        }
        // ***end new***

        let friendsListHtml = '<p>Loading friends...</p>';
        try {
          const friendsResponse = await fetch('/api/friends', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (friendsResponse.ok) {
            const friends = await friendsResponse.json();
            if (friends.length > 0) {
              const onlineUserIds = new Set(onlineUserCache.map(u => u.userId));
              friendsListHtml = `
                <div class="online-users-container-profile">
                  <div class="container-heading">
                    <h4 class="online-users-heading">Friends</h4>
                  </div>
                  <ul class="friends-list">
                    ${friends.map((friend: any) => {
                      const isOnline = onlineUserIds.has(friend.id);
                      const indicatorHtml = isOnline ? '<span class="online-indicator"></span>' : '';
                      return `
                        <li data-user-id="${friend.id}">
                          <img src="${friend.avatar_path || '/avatars/default.png'}" alt="${friend.username}'s avatar" />
                          ${indicatorHtml}
                          <span>${friend.username}</span>
                        </li>
                      `;
                    }).join('')}
                  </ul>
                </div>
              `;
            } else {
              friendsListHtml = `
                <div class="online-users-container-profile">
                  <h4>Friends</h4>
                  <p>No friends yet😢</p>
                </div>`;
            }
          } else {
            friendsListHtml = '<p>Could not load friends list.</p>';
          }
        } catch (e) {
          console.error('Failed to fetch friends:', e);
          friendsListHtml = '<p>Error loading friends list.</p>';
        }

        contentArea.innerHTML = `
          <div class="dashboard-heading-container">
            <h3 class="dashboard-content-heading">${userProfile.username || 'N/A'}</h3>
            <button id="edit-profile-btn" class="edit-profile-button" title="Edit Profile">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          <div class="profile-details">
            <div class="profile-avatar-container">
              <img id="profileAvatar" 
                   src="${userProfile.avatar || '/avatars/default.png'}" 
                   alt="User Avatar" 
                   class="profile-avatar-img" 
                   style="cursor: pointer;" 
                   title="Click to change avatar">
            </div>
            <p class="dashboard-content-paragraph"><strong>Email:</strong> ${userProfile.email || 'N/A'}</p>
            <p id="avatarUploadStatus" class="dashboard-content-paragraph" style="min-height: 1.2em; margin-top: 0.5rem;"></p>
          </div>
          <div class="profile-lower-container">
            ${friendsListHtml}
            <div class="online-users-container-profile">
              <div class="container-heading">
                <h4 class="online-users-heading">All Players</h4>
                <button id="refresh-players-btn" class="refresh-btn" title="Refresh List">🔄</button>
              </div>
              <ul id="all-players-list" class="online-users-list">
                ${allUsersHtml}
              </ul>
            </div>
            ${matchHistoryHtml}
          </div>
        `;

        // Add click listeners to new friends list
        const friendsList = contentArea.querySelector<HTMLUListElement>('.friends-list');
        if (friendsList) {
          friendsList.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', () => {
              const friendId = parseInt(item.dataset.userId || '0');
              if (friendId) {
                showUserProfileModal(friendId);
              }
            });
          });
        }

        // *** NEW: Attach event listeners to the new 'All Players' list ***
        const allPlayersList = contentArea.querySelector<HTMLUListElement>('#all-players-list');
        if (allPlayersList) {
          allPlayersList.querySelectorAll('.online-user-item').forEach(item => {
            item.addEventListener('click', (e) => {
              const target = e.currentTarget as HTMLLIElement;
              const userId = parseInt(target.dataset.userId || '0');
              if (userId) {
                showUserProfileModal(userId);
              }
            });
          });
        }

        // *** Refresh button ***
        const refreshPlayersBtn = contentArea.querySelector<HTMLButtonElement>('#refresh-players-btn');
        if (refreshPlayersBtn) {
          refreshPlayersBtn.addEventListener('click', () => {
            setActiveView('profile', buttons, contentArea);
          });
        }
        
        const profileAvatarImg = contentArea.querySelector<HTMLImageElement>('#profileAvatar');
        const avatarUploadStatus = contentArea.querySelector<HTMLParagraphElement>('#avatarUploadStatus');
        const editProfileBtn = contentArea.querySelector<HTMLButtonElement>('#edit-profile-btn');

        if (editProfileBtn && token) {
          editProfileBtn.addEventListener('click', () => {
            profileEdit(token, { username: userProfile.username, email: userProfile.email });
          });
        }

        if (profileAvatarImg && avatarUploadStatus && token) {
          profileAvatarImg.addEventListener('click', () => {
            openAvatarSelectionModal(token, profileAvatarImg, avatarUploadStatus);
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        contentArea.innerHTML = `
          <h3 class="dashboard-content-heading">Profile</h3>
          <p class="dashboard-content-paragraph">Could not load profile information. Please try again later.</p>
        `;
      }
      break;
    case 'game':
      const gameContent = document.createElement('div');
      gameContent.className = "dashboard-game-content";
      gameContent.innerHTML = `<h3 class="dashboard-content-heading">Choose your Game</h3>`;

      const gameOptionsContainer = document.createElement('div');
      gameOptionsContainer.className = 'game-options-container';

      const gameOptions = [
        {
          title: 'Local Match',
          image: '/avatars/local.png',
          action: () => navigateTo('/game?localTournament=true')
        },
        {
          title: 'Play against AI',
          image: '/avatars/ai.png',
          action: () => navigateTo('/game?mode=ai')
        },
        {
          title: 'Tournament',
          image: '/avatars/tournament.png',
          action: () => navigateTo('/game?tournament=true')
        }
      ];

      gameOptions.forEach(option => {
        const card = document.createElement('div');
        card.className = 'game-option-card';
        card.innerHTML = `
          <img src="${option.image}" alt="${option.title}">
          <h4>${option.title}</h4>
        `;
        card.addEventListener('click', option.action);
        gameOptionsContainer.appendChild(card);
      });

      gameContent.appendChild(gameOptionsContainer);
      contentArea.appendChild(gameContent);
      break;
    case 'chat':
      // Try to get username for display
      let username = 'User';
      const token = sessionStorage.getItem('authToken');
      if (token) {
        try {
          const response = await fetch('/api/profile', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const userProfile = await response.json();
            username = userProfile.username || 'User';
          }
        } catch (e) {
          // Ignore error, fallback to default username
        }
      }
      contentArea.innerHTML = `
          <h3 class="dashboard-content-heading">${username}'s Messages</h3>
        `;
      if (chatSocket && chatSocket.connected) {
        renderChat(chatSocket);
      } else {
        // add
      }
      break;
  }
}