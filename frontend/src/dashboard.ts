import './dashboard.css';
import { navigateTo } from './main';
import { connectSocket, disconnectSocket, getSocket } from './socketManager';
import { openAvatarSelectionModal } from './avatarModal';
import { displayChallengeModal } from './challengeModal';



let onlineUsersUpdateListener: ((users: { username: string; socketId: string }[]) => void) | null = null;
let onlineUsersListContainer: HTMLDivElement | null = null;
let onSocketConnectForDashboardListener: (() => void) | null = null;
let ownSocketId: string | null = null;
let ownUsername: string | null = localStorage.getItem('username');

interface PendingMatchData {
  gameId: string;
  player1SocketId: string;
  player2SocketId: string;
  isPlayer1: boolean;
  localPlayerReady: boolean;
  opponentReady: boolean;
  message: string;
}
let currentPendingMatch: PendingMatchData | null = null;
let gameContentAreaRef: HTMLDivElement | null = null; 

function setupDashboardSocketListeners() {
  const socket = getSocket();
  if (!socket) {
    console.warn('[Dashboard] Socket not available for setting up listeners.');
    return;
  }
  ownUsername = localStorage.getItem('username');

  // Remove any existing listeners to avoid duplicates
  socket.off('incoming_challenge');
  socket.off('challenge_sent');
  socket.off('challenge_rejected');
  socket.off('challenge_error');
  socket.off('game_setup_failed');
  socket.off('start_game');
  socket.off('match_confirmed_get_ready');
  socket.off('ready_acknowledged');
  socket.off('opponent_ready_status');
  socket.off('start_actual_game');
  socket.off('error_starting_match');
  socket.off('already_ready');
  socket.off('opponent_disconnected_before_match_start');
  socket.off('opponent_disconnected_mid_game');

  // console.log('[Dashboard] Setting up dashboard socket listeners.');

  socket.on('incoming_challenge', (data: { challengerUsername: string; challengerSocketId: string; message: string }) => {
    // console.log('[Dashboard] Incoming challenge:', data);
    displayChallengeModal(data.challengerUsername, data.challengerSocketId, ownSocketId, ownUsername);
  });

  socket.on('challenge_sent', (data: { message: string }) => {
    // console.log('[Dashboard] Challenge sent:', data.message);
    alert(data.message);
  });

  socket.on('challenge_rejected', (data: { rejectedBy: string; message: string }) => {
    // console.log('[Dashboard] Challenge rejected:', data);
    alert(`Challenge Rejected: ${data.message}`);
  });

  socket.on('challenge_error', (data: { message: string }) => {
    // console.error('[Dashboard] Challenge error:', data.message);
    alert(`Challenge Error: ${data.message}`);
  });

  socket.on('game_setup_failed', (data: { message: string }) => {
    console.error('[Dashboard] Game setup failed:', data.message);
    alert(`Game Setup Failed: ${data.message}`);
    currentPendingMatch = null;
    updateGameLobbyUI();
  });

  // Handlers for the new match flow
  socket.on('match_confirmed_get_ready', (data: { gameId: string, message: string, player1SocketId: string, player2SocketId: string }) => {
    // console.log('[Dashboard] Match confirmed, get ready:', data);
    ownSocketId = socket.id ?? null; 
    currentPendingMatch = {
      gameId: data.gameId,
      player1SocketId: data.player1SocketId,
      player2SocketId: data.player2SocketId,
      isPlayer1: (socket.id || "") === data.player1SocketId,
      localPlayerReady: false,
      opponentReady: false,
      message: data.message
    };
    if (gameContentAreaRef && document.getElementById('dashboard-content')?.contains(gameContentAreaRef)) {
      updateGameLobbyUI();
    }
    alert(data.message); 
  });

  socket.on('ready_acknowledged', (data: { gameId: string, message: string }) => {
    // console.log('[Dashboard] Ready acknowledged:', data);
    if (currentPendingMatch && currentPendingMatch.gameId === data.gameId) {
      currentPendingMatch.localPlayerReady = true;
      currentPendingMatch.message = data.message;
      updateGameLobbyUI();
    }
  });

  socket.on('opponent_ready_status', (data: { gameId: string, message: string }) => {
    // console.log('[Dashboard] Opponent ready status:', data);
    if (currentPendingMatch && currentPendingMatch.gameId === data.gameId) {
      currentPendingMatch.opponentReady = true;
      currentPendingMatch.message += `\n${data.message}`;
      updateGameLobbyUI();
    }
  });

  socket.on('start_actual_game', (data: { gameId: string, message: string, player1SocketId: string, player2SocketId: string }) => {
    // console.log('[Dashboard] Both players ready, starting actual game:', data);
    if (currentPendingMatch && currentPendingMatch.gameId === data.gameId) {
      alert(data.message);
      navigateTo(`/game?matchId=${data.gameId}&p1=${data.player1SocketId}&p2=${data.player2SocketId}`);
      currentPendingMatch = null;
    }
  });

  socket.on('error_starting_match', (data: { message: string }) => {
    // console.error('[Dashboard] Error starting match:', data.message);
    alert(`Error: ${data.message}`);
    currentPendingMatch = null;
    updateGameLobbyUI();
  });
  
  socket.on('already_ready', (data: { gameId: string, message: string }) => {
    // console.log('[Dashboard] Already ready:', data.message);
    if (currentPendingMatch && currentPendingMatch.gameId === data.gameId) {
        currentPendingMatch.localPlayerReady = true;
        currentPendingMatch.message = data.message;
        updateGameLobbyUI();
    }
    alert(data.message);
  });

  socket.on('opponent_disconnected_before_match_start', (data: { gameId: string, message: string }) => {
    // console.warn('[Dashboard] Opponent disconnected before match start:', data);
    if (currentPendingMatch && currentPendingMatch.gameId === data.gameId) {
      alert(data.message);
      currentPendingMatch = null;
      updateGameLobbyUI();
    }
  });
  
  socket.on('opponent_disconnected_mid_game', (data: { gameId: string, message: string }) => {
    // console.warn('[Dashboard] Opponent disconnected mid-game (event received on dashboard):', data);
    if (currentPendingMatch && currentPendingMatch.gameId === data.gameId) {
      alert(data.message + " (Match cancelled)");
      currentPendingMatch = null;
      updateGameLobbyUI();
    }
  });
}

function updateGameLobbyUI() {
  if (!gameContentAreaRef) {
    const mainContentArea = document.getElementById('dashboard-content');
    if (mainContentArea && mainContentArea.firstChild && (mainContentArea.firstChild as HTMLElement).classList?.contains('game-view-content')) {
        gameContentAreaRef = mainContentArea.firstChild as HTMLDivElement;
    } else {
        return;
    }
  }

  gameContentAreaRef.innerHTML = ''; 

  if (currentPendingMatch) {
    const { gameId, localPlayerReady, opponentReady, message } = currentPendingMatch;

    const statusDiv = document.createElement('div');
    statusDiv.className = 'match-status-container';
    
    const heading = document.createElement('h3');
    heading.textContent = `Match Lobby: ${gameId}`;
    statusDiv.appendChild(heading);

    const statusMessage = document.createElement('p');
    statusMessage.textContent = message;
    statusMessage.style.whiteSpace = 'pre-line';
    statusDiv.appendChild(statusMessage);

    if (!localPlayerReady) {
      const startButton = document.createElement('button');
      startButton.textContent = 'Start Match';
      startButton.className = 'dashboard-game-button';
      startButton.id = 'start-match-button';
      startButton.onclick = () => {
        const socket = getSocket();
        if (socket && currentPendingMatch) {
          socket.emit('player_ready_for_match', { gameId: currentPendingMatch.gameId });
          startButton.disabled = true;
          startButton.textContent = 'Waiting for Server...';
        }
      };
      statusDiv.appendChild(startButton);
    } else if (localPlayerReady && !opponentReady) {
      const waitingMsg = document.createElement('p');
      waitingMsg.textContent = 'You are ready. Waiting for opponent...';
      statusDiv.appendChild(waitingMsg);
    } else if (localPlayerReady && opponentReady) {
      const bothReadyMsg = document.createElement('p');
      bothReadyMsg.textContent = 'Both players ready! Starting game shortly...';
      statusDiv.appendChild(bothReadyMsg);
    }
    
    gameContentAreaRef.appendChild(statusDiv);

  } else {
    // No pending match, show online users list
    const onlineUsersHeading = document.createElement('h3');
    onlineUsersHeading.className = 'dashboard-content-heading';
    onlineUsersHeading.textContent = 'Challenge Players';
    gameContentAreaRef.appendChild(onlineUsersHeading);
    
    onlineUsersListContainer = document.createElement('div');
    onlineUsersListContainer.id = 'online-users-list';
    onlineUsersListContainer.className = 'dashboard-online-users';
    onlineUsersListContainer.innerHTML = '<h4>Online Users:</h4><ul><li>Loading...</li></ul>';
    gameContentAreaRef.appendChild(onlineUsersListContainer);

    const socket = getSocket();
    if (socket && socket.connected) {
      setupOnlineUsersListener(); 
    } else if (socket) {
        if (onSocketConnectForDashboardListener) {
            socket.off('connect', onSocketConnectForDashboardListener);
        }
        onSocketConnectForDashboardListener = () => {
            setupOnlineUsersListener();
            socket.off('connect', onSocketConnectForDashboardListener!); 
            onSocketConnectForDashboardListener = null; 
        };
        socket.on('connect', onSocketConnectForDashboardListener);
        if (onlineUsersListContainer) {
            onlineUsersListContainer.innerHTML = '<h4>Online Users:</h4><ul><li>Connecting to server...</li></ul>';
        }
    } else {
        if (onlineUsersListContainer) {
            onlineUsersListContainer.innerHTML = '<h4>Online Users:</h4><ul><li>Socket not available.</li></ul>';
        }
    }
  }
}

async function setActiveView(view: string, buttons: HTMLButtonElement[], contentArea: HTMLDivElement) {
  buttons.forEach(btn => btn.classList.remove('active'));
  const activeButton = buttons.find(btn => btn.dataset.view === view);
  if (activeButton) {
    activeButton.classList.add('active');
  }

  const currentSocket = getSocket();
  if (onlineUsersUpdateListener && currentSocket) {
    currentSocket.off('online_users_update', onlineUsersUpdateListener);
  }
  if (onSocketConnectForDashboardListener && currentSocket) { 
    currentSocket.off('connect', onSocketConnectForDashboardListener);
  }

  contentArea.innerHTML = '';

  switch (view) {
    case 'profile':
      gameContentAreaRef = null;
      contentArea.innerHTML = `<h3 class="dashboard-content-heading">Profile</h3><p class="dashboard-content-paragraph">Loading profile...</p>`;
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          contentArea.innerHTML = `
            <h3 class="dashboard-content-heading">Profile</h3>
            <p class="dashboard-content-paragraph">Error: You are not logged in or your session has expired.</p>
            <button id="profile-login-redirect" class="dashboard-game-button">Go to Login</button>
          `;
          contentArea.querySelector<HTMLButtonElement>('#profile-login-redirect')?.addEventListener('click', () => navigateTo('/login'));
          return;
        }
        const response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            contentArea.innerHTML = `
              <h3 class="dashboard-content-heading">Profile</h3>
              <p class="dashboard-content-paragraph">Error: Unauthorized. Your session may have expired.</p>
              <p class="dashboard-content-paragraph">Please <a href="/login" style="color: #3498db; text-decoration: underline;">login</a> again.</p>
            `;
          } else {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }
          return;
        }
        const userProfile = await response.json();
        contentArea.innerHTML = `
          <h3 class="dashboard-content-heading">Profile</h3>
          <div class="profile-details">
            <div class="profile-avatar-container">
              <img id="profileAvatar" 
                   src="${userProfile.avatar || '/images/default-avatar.png'}" 
                   alt="User Avatar" 
                   class="profile-avatar-img" 
                   style="cursor: pointer;" 
                   title="Click to change avatar">
            </div>
            <p class="dashboard-content-paragraph"><strong>Username:</strong> ${userProfile.username || 'N/A'}</p>
            <p class="dashboard-content-paragraph"><strong>Email:</strong> ${userProfile.email || 'N/A'}</p>
            <p id="avatarUploadStatus" class="dashboard-content-paragraph" style="min-height: 1.2em; margin-top: 0.5rem;"></p>
          </div>
        `;
        const profileAvatarImg = contentArea.querySelector<HTMLImageElement>('#profileAvatar');
        const avatarUploadStatus = contentArea.querySelector<HTMLParagraphElement>('#avatarUploadStatus');
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
      gameContentAreaRef = document.createElement('div');
      gameContentAreaRef.className = 'game-view-content';
      contentArea.appendChild(gameContentAreaRef);
      updateGameLobbyUI(); // **** Update game lobby UI
      break;
    case 'chat':
      gameContentAreaRef = null; // Reset game content area reference
      contentArea.innerHTML = `
        <h3 class="dashboard-content-heading">Chat</h3>
        <p class="dashboard-content-paragraph">Connect with other players.</p>
        <!-- Add chat interface elements here -->
      `;
      break;
  }
}

const setupOnlineUsersListener = () => {
  const socket = getSocket();
  console.log('[DEBUG] setupOnlineUsersListener: CALLED.');
  if (socket && onlineUsersUpdateListener) {
    socket.off('online_users_update', onlineUsersUpdateListener);
    socket.on('online_users_update', onlineUsersUpdateListener);
    console.log("[DEBUG] setupOnlineUsersListener: Attached 'online_users_update'. Requesting list.");
    socket.emit('get_current_online_users'); 
  } else {
    console.warn('[DEBUG] setupOnlineUsersListener: Socket or onlineUsersUpdateListener not ready.');
  }
};

// Define the listener function for updating the online users list UI
onlineUsersUpdateListener = (users: { username: string; socketId: string }[]) => {
  console.log('[DEBUG] onlineUsersUpdateListener: CALLED. Users:', JSON.stringify(users));
  if (!onlineUsersListContainer) {
    console.error('[DEBUG] onlineUsersUpdateListener: onlineUsersListContainer is NULL.');
    return;
  }
  
  const ul = document.createElement('ul');
  ownUsername = localStorage.getItem('username');
  let otherUsersExist = false;

  if (users.length > 0) {
    users.forEach(user => {
      if (user.socketId === ownSocketId) return; 
      otherUsersExist = true;

      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '5px 0';

      const userNameSpan = document.createElement('span');
      userNameSpan.textContent = `${user.username}`; 
      li.appendChild(userNameSpan);

      const challengeButton = document.createElement('button');
      challengeButton.textContent = 'Challenge';
      challengeButton.className = 'dashboard-game-button'; 
      challengeButton.style.marginLeft = '10px';
      challengeButton.style.padding = '0.25rem 0.5rem'; 
      challengeButton.style.fontSize = '0.8rem';

      challengeButton.addEventListener('click', () => {
        const socket = getSocket();
        if (!socket || !socket.connected) {
          alert('Socket not connected. Cannot send challenge.');
          return;
        }
        if (!ownSocketId) {
          alert('Your session ID is not available. Cannot send challenge.');
          return;
        }
        socket.emit('challenge_user', {
          challengerSocketId: ownSocketId, 
          challengedSocketId: user.socketId,
          challengedUsername: user.username
        });
      });
      li.appendChild(challengeButton);
      ul.appendChild(li);
    });
  }
  
  if (!otherUsersExist) {
    const li = document.createElement('li');
    if (users.some(u => u.socketId === ownSocketId && users.length === 1)) {
        li.textContent = 'No other users currently online to challenge.';
    } else {
        li.textContent = 'No users currently online.';
    }
    ul.appendChild(li);
  }

  const heading = onlineUsersListContainer.querySelector('h4');
  onlineUsersListContainer.innerHTML = ''; 
  if (heading) onlineUsersListContainer.appendChild(heading);
  onlineUsersListContainer.appendChild(ul);
};


export function renderDashboard() {
  const appElement = document.querySelector<HTMLDivElement>('#app');
  if (!appElement) {
    throw new Error('App root element (#app) not found!');
  }
  ownUsername = localStorage.getItem('username');
  const token = localStorage.getItem('authToken');
  let currentSocket = getSocket();

  if (token) {
    if (!currentSocket || !currentSocket.connected) {
      const newSocket = connectSocket(token); 
      if (newSocket) {
        currentSocket = newSocket;
        ownSocketId = newSocket.id ?? null; 
        newSocket.once('connect', () => {
          ownSocketId = newSocket.id ?? null;
          console.log('[DEBUG] renderDashboard: Socket connected via newSocket, ownSocketId:', ownSocketId);
          setupDashboardSocketListeners();
        });
      }
    } else {
      ownSocketId = currentSocket.id ?? null; 
      setupDashboardSocketListeners();
    }
  } else {
    navigateTo('/login');
    return; 
  }

  appElement.innerHTML = '';

  const globalContainer = document.createElement('div');
  globalContainer.className = "dashboard-global-container";
  const cardContainer = document.createElement('div');
  cardContainer.className = "dashboard-card-container";
  const sidebar = document.createElement('div');
  sidebar.className = "dashboard-sidebar";
  const sidebarHeading = document.createElement('h2');
  sidebarHeading.className = "dashboard-heading";
  sidebarHeading.textContent = "Dashboard";
  const nav = document.createElement('nav');
  nav.className = "dashboard-nav";

  const profileButton = document.createElement('button');
  profileButton.className = "dashboard-nav-button";
  profileButton.textContent = "Profile";
  profileButton.dataset.view = "profile";

  const gameButton = document.createElement('button');
  gameButton.className = "dashboard-nav-button";
  gameButton.textContent = "Game";
  gameButton.dataset.view = "game";

  const chatButton = document.createElement('button');
  chatButton.className = "dashboard-nav-button";
  chatButton.textContent = "Chat";
  chatButton.dataset.view = "chat";

  const logoutButton = document.createElement('button');
  logoutButton.className = "dashboard-logout-button";
  logoutButton.textContent = "Logout";

  const contentArea = document.createElement('div');
  contentArea.className = "dashboard-content-area";
  contentArea.id = "dashboard-content";

  nav.appendChild(profileButton);
  nav.appendChild(gameButton);
  nav.appendChild(chatButton);
  sidebar.appendChild(sidebarHeading);
  sidebar.appendChild(nav);
  nav.appendChild(logoutButton);

  cardContainer.appendChild(sidebar);
  cardContainer.appendChild(contentArea);
  globalContainer.appendChild(cardContainer);
  appElement.appendChild(globalContainer);

  const navButtons = [profileButton, gameButton, chatButton];
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      if (view) {
        setActiveView(view, navButtons, contentArea);
      }
    });
  });

  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentGameId'); // Clear game related items
    localStorage.removeItem('myPlayerRole');
    disconnectSocket(); 
    
    // Clear module-level states
    currentPendingMatch = null;
    gameContentAreaRef = null;

    const socket = getSocket(); // getSocket() might return null after disconnectSocket
    if (socket) { // Check if socket still exists to call .off
        if (onlineUsersUpdateListener) socket.off('online_users_update', onlineUsersUpdateListener);
        if (onSocketConnectForDashboardListener) socket.off('connect', onSocketConnectForDashboardListener);
    }
    navigateTo('/');
  });
  
  // Initial active view
  if (currentPendingMatch) {
    setActiveView('game', navButtons, contentArea);
  } else {
    setActiveView('profile', navButtons, contentArea);
  }
}
