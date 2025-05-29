import './dashboard.css';
import { navigateTo } from './main';
import { disconnectSocket, getSocket } from './socketManager'; 
import { Socket } from 'socket.io-client'; // For type hinting

// --- Interfaces ---
interface OnlineUser {
  userId: string;
  username: string;
  status: 'online' | 'in-game' | 'in-challenge'; // Add status
}

interface ChallengeReceivedPayload {
  challengerUserId: string;
  challengerUsername: string;
}

interface GameStartingPayload {
  gameId: string;
  opponentUsername: string;
  opponentUserId: string;
  role: 'player1' | 'player2';
}

// Define an interface for the socket object that includes custom properties
interface SocketWithUserData extends Socket {
  userId?: string;
  username?: string;
}

// --- Module-level variables ---
let onlineUsersUpdateListener: ((users: OnlineUser[]) => void) | null = null;
let onSocketConnectForDashboardListener: (() => void) | null = null;
let onlineUsersListContainer: HTMLDivElement | null = null;
let challengeModal: HTMLDivElement | null = null; // For displaying incoming challenges

// --- New Listeners for Challenge Flow ---
let challengeReceivedListener: ((payload: ChallengeReceivedPayload) => void) | null = null;
let challengeOutcomeListener: ((payload: { opponentUsername: string, message?: string }) => void) | null = null; // For declined/error/initiated
let challengeExpiredListener: ((payload: { opponentUsername: string }) => void) | null = null;
let gameStartingListener: ((payload: GameStartingPayload) => void) | null = null;
let challengeErrorListener: ((payload: { message: string }) => void) | null = null;

// Placeholder for the missing function. You'll need to implement or import this.
function openAvatarSelectionModal(token: string, _profileAvatarImg: HTMLImageElement, avatarUploadStatus: HTMLParagraphElement) {
  console.warn('openAvatarSelectionModal function is not implemented. Token:', token);
  // Example implementation:
  if (avatarUploadStatus) {
    avatarUploadStatus.textContent = 'Avatar selection modal would open here.';
  }
  // alert('Avatar selection functionality not yet implemented.');
}

function cleanupDashboardSocketListeners(socket: Socket | null) {
    if (!socket) socket = getSocket();
    if (!socket) return;

    if (onlineUsersUpdateListener) socket.off('online_users_update', onlineUsersUpdateListener);
    if (onSocketConnectForDashboardListener) socket.off('connect', onSocketConnectForDashboardListener);
    if (challengeReceivedListener) socket.off('challenge_received', challengeReceivedListener);
    if (challengeOutcomeListener) {
        socket.off('challenge_initiated', challengeOutcomeListener);
        socket.off('challenge_declined', challengeOutcomeListener);
    }
    if (challengeExpiredListener) socket.off('challenge_expired', challengeExpiredListener);
    if (gameStartingListener) socket.off('game_starting', gameStartingListener);
    if (challengeErrorListener) socket.off('challenge_error', challengeErrorListener);
    
    onlineUsersUpdateListener = null;
    onSocketConnectForDashboardListener = null;
    challengeReceivedListener = null;
    challengeOutcomeListener = null;
    challengeExpiredListener = null;
    gameStartingListener = null;
    challengeErrorListener = null;
}


export function renderDashboard() {
  const appElement = document.querySelector<HTMLDivElement>('#app');
  if (!appElement) throw new Error('App root element (#app) not found!');
  appElement.innerHTML = '';

  const globalContainer = document.createElement('div');
  const cardContainer = document.createElement('div');
  const sidebar = document.createElement('div');
  const sidebarHeading = document.createElement('h2');
  const nav = document.createElement('nav');
  const profileButton = document.createElement('button');
  const gameButton = document.createElement('button');
  const chatButton = document.createElement('button');
  const logoutButton = document.createElement('button');
  const contentArea = document.createElement('div');

  // Basic structure, assuming class names are set as before
  globalContainer.className = "dashboard-global-container";
  cardContainer.className = "dashboard-card-container";
  sidebar.className = "dashboard-sidebar";
  sidebarHeading.className = "dashboard-heading";
  sidebarHeading.textContent = "Dashboard";
  nav.className = "dashboard-nav";
  profileButton.className = "dashboard-nav-button";
  profileButton.textContent = "Profile";
  profileButton.dataset.view = "profile";
  gameButton.className = "dashboard-nav-button";
  gameButton.textContent = "Game";
  gameButton.dataset.view = "game";
  chatButton.className = "dashboard-nav-button";
  chatButton.textContent = "Chat";
  chatButton.dataset.view = "chat";
  logoutButton.className = "dashboard-logout-button";
  logoutButton.textContent = "Logout";
  contentArea.className = "dashboard-content-area";
  contentArea.id = "dashboard-content";

  nav.appendChild(profileButton);
  nav.appendChild(gameButton);
  nav.appendChild(chatButton);
  sidebar.appendChild(sidebarHeading);
  sidebar.appendChild(nav);
  sidebar.appendChild(logoutButton); // Moved logout to be part of sidebar consistently
  cardContainer.appendChild(sidebar);
  cardContainer.appendChild(contentArea);
  globalContainer.appendChild(cardContainer);
  appElement.appendChild(globalContainer);


  const navButtons = [profileButton, gameButton, chatButton];
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      if (view) setActiveView(view, navButtons, contentArea);
    });
  });

  logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('authToken');
    cleanupDashboardSocketListeners(null); // Clean up all dashboard listeners
    disconnectSocket(); // Disconnect the main socket
    if (onlineUsersListContainer) onlineUsersListContainer.remove();
    onlineUsersListContainer = null;
    if (challengeModal) challengeModal.remove();
    challengeModal = null;
    navigateTo('/');
  });

  // --- Initial View & Cleanup ---
  cleanupDashboardSocketListeners(null); // Clean up from any previous render
  if (onlineUsersListContainer) onlineUsersListContainer.remove();
  onlineUsersListContainer = null;
  if (challengeModal) challengeModal.remove();
  challengeModal = null;

  setActiveView('profile', navButtons, contentArea); 
  setupGlobalChallengeListeners(); // Setup listeners that should persist across dashboard views
}


// --- Setup listeners for challenges and game events --
function setupGlobalChallengeListeners() {
    const socket = getSocket() as SocketWithUserData | null;
    if (!socket) return;

    // Listener for receiving a challenge
    challengeReceivedListener = ({ challengerUserId, challengerUsername }: ChallengeReceivedPayload) => {
        showChallengeModal(challengerUserId, challengerUsername);
    };
    socket.on('challenge_received', challengeReceivedListener);

    // Listener for game starting
    gameStartingListener = (payload: GameStartingPayload) => {
        console.log('Game starting event received:', payload); // Existing log
        sessionStorage.setItem('currentGameInfo', JSON.stringify(payload));
        console.log('currentGameInfo set in sessionStorage');
        closeChallengeModal();
        console.log('Challenge modal closed');
        navigateTo('/game'); 
        console.log('navigateTo("/game") called'); // New log
    };
    socket.on('game_starting', gameStartingListener);

    // Listener for various challenge outcomes (initiated, declined, error, expired)
    challengeOutcomeListener = ({ opponentUsername, message}) => {
        // Display this info in a less intrusive way, e.g. a toast notification
        alert(message || `Challenge update regarding ${opponentUsername}.`);
        // Could also update UI if a challenge was pending from this client
    };
    socket.on('challenge_initiated', (data) => {
        if (challengeOutcomeListener) {
            challengeOutcomeListener({...data, message: `Challenge sent to ${data.opponentUsername}. Waiting for response...`});
        }
    });
    socket.on('challenge_declined', (data) => {
        if (challengeOutcomeListener) {
            challengeOutcomeListener({...data, message: `${data.opponentUsername} declined your challenge.`});
        }
    });
    
    challengeExpiredListener = ({ opponentUsername }) => {
        alert(`Your challenge to ${opponentUsername} has expired.`);
    };
    socket.on('challenge_expired', challengeExpiredListener);
    
    socket.on('challenge_request_expired', () => { // When a challenge TO ME expires
        alert('A game challenge you received has expired.');
        closeChallengeModal();
    });
    socket.on('challenge_request_cancelled', () => {
        alert('A game challenge you received was cancelled by the challenger.');
        closeChallengeModal();
    });


    challengeErrorListener = ({ message }) => {
        alert(`Challenge Error: ${message}`);
    };
    socket.on('challenge_error', challengeErrorListener);
}

function showChallengeModal(challengerUserId: string, challengerUsername: string) {
    closeChallengeModal(); // Close any existing modal

    challengeModal = document.createElement('div');
    challengeModal.className = 'challenge-modal-overlay';
    challengeModal.innerHTML = `
        <div class="challenge-modal-content">
            <h4>Incoming Challenge!</h4>
            <p>${challengerUsername} wants to play a game with you.</p>
            <div class="challenge-modal-actions">
                <button id="acceptChallengeBtn">Accept</button>
                <button id="declineChallengeBtn">Decline</button>
            </div>
        </div>
    `;
    document.body.appendChild(challengeModal);

    challengeModal.querySelector('#acceptChallengeBtn')?.addEventListener('click', () => {
        getSocket()?.emit('challenge_response', { challengerUserId, accepted: true });
        // Optionally show "Connecting to game..." in modal
        if (challengeModal) {
            const content = challengeModal.querySelector('.challenge-modal-content p');
            if (content) content.textContent = "Accepted! Waiting for game to start...";
            challengeModal.querySelector('.challenge-modal-actions')?.remove();
        }
    });
    challengeModal.querySelector('#declineChallengeBtn')?.addEventListener('click', () => {
        getSocket()?.emit('challenge_response', { challengerUserId, accepted: false });
        closeChallengeModal();
    });
}

function closeChallengeModal() {
    if (challengeModal) {
        challengeModal.remove();
        challengeModal = null;
    }
}


async function setActiveView(view: string, buttons: HTMLButtonElement[], contentArea: HTMLDivElement) {
  buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));

  // Cleanup specific listeners if they were view-dependent (onlineUsersUpdateListener is)
  const socket = getSocket() as SocketWithUserData | null;
  if (onlineUsersUpdateListener && socket) {
    socket.off('online_users_update', onlineUsersUpdateListener);
    onlineUsersUpdateListener = null;
  }
  if (onSocketConnectForDashboardListener && socket) {
    socket.off('connect', onSocketConnectForDashboardListener);
    onSocketConnectForDashboardListener = null;
  }
  if (onlineUsersListContainer) {
    onlineUsersListContainer.remove();
    onlineUsersListContainer = null;
  }
  
  contentArea.innerHTML = ''; 

  switch (view) {
    case 'profile':
      contentArea.innerHTML = `<h3 class="dashboard-content-heading">Profile</h3><p class="dashboard-content-paragraph">Loading profile...</p>`; // Show loading state
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
      const gameContent = document.createElement('div');
      gameContent.innerHTML = `
        <h3 class="dashboard-content-heading">Game Options</h3>
        <p class="dashboard-content-paragraph">Challenge another player or start a local match.</p>
      `;
      
      const localButton = document.createElement('button');
      localButton.className = "dashboard-game-button";
      localButton.textContent = "Play Local Match";
      localButton.addEventListener('click', () => navigateTo('/game?mode=local')); // Differentiate local game
      gameContent.appendChild(localButton);

      onlineUsersListContainer = document.createElement('div');
      onlineUsersListContainer.className = 'dashboard-online-users';
      onlineUsersListContainer.innerHTML = '<h4>Online Players:</h4><ul><li>Loading...</li></ul>';
      gameContent.appendChild(onlineUsersListContainer);
      contentArea.appendChild(gameContent);

      if (socket) {
        onlineUsersUpdateListener = (users: OnlineUser[]) => {
          if (!onlineUsersListContainer) return;
          const ul = document.createElement('ul');
          // const currentUser = onlineUsers.get(socket.userId || ''); // Removed: onlineUsers is server-side, currentUser not used

          if (users.length === 0 || (users.length === 1 && users[0].userId === socket.userId)) {
            ul.innerHTML = '<li>No other players currently online.</li>';
          } else {
            users.forEach(user => {
              if (user.userId === socket.userId) return; // Don't list self for challenging

              const li = document.createElement('li');
              li.innerHTML = `
                <span>${user.username} (Status: ${user.status})</span>
              `;
              if (user.status === 'online') {
                const challengeButton = document.createElement('button');
                challengeButton.textContent = 'Challenge';
                challengeButton.className = 'challenge-btn';
                challengeButton.onclick = () => {
                  socket.emit('initiate_challenge', { opponentUserId: user.userId });
                  // Optionally disable button or show "Challenge sent"
                  challengeButton.disabled = true;
                  challengeButton.textContent = 'Challenge Sent';
                  setTimeout(() => { // Re-enable after a bit or on challenge failure/expiry
                    if(document.body.contains(challengeButton)) { // Check if button still exists
                        challengeButton.disabled = false;
                        challengeButton.textContent = 'Challenge';
                    }
                  }, 10000); // Example timeout
                };
                li.appendChild(challengeButton);
              }
              ul.appendChild(li);
            });
          }
          const heading = onlineUsersListContainer.querySelector('h4');
          onlineUsersListContainer.innerHTML = '';
          if (heading) onlineUsersListContainer.appendChild(heading);
          onlineUsersListContainer.appendChild(ul);
        };

        const setupOnlineUsersView = () => {
            if (socket && onlineUsersUpdateListener) {
                socket.off('online_users_update', onlineUsersUpdateListener); // Remove old before adding new
                socket.on('online_users_update', onlineUsersUpdateListener);
                socket.emit('dashboard_request_online_users'); // Request initial list
            }
        };

        if (socket.connected) {
          setupOnlineUsersView();
        } else {
          if (onlineUsersListContainer) onlineUsersListContainer.innerHTML = '<h4>Online Players:</h4><ul><li>Socket connecting...</li></ul>';
          onSocketConnectForDashboardListener = () => {
            setupOnlineUsersView();
            if (socket && onSocketConnectForDashboardListener) {
              socket.off('connect', onSocketConnectForDashboardListener);
              onSocketConnectForDashboardListener = null;
            }
          };
          socket.on('connect', onSocketConnectForDashboardListener);
        }
      } else {
        if (onlineUsersListContainer) onlineUsersListContainer.innerHTML = '<h4>Online Players:</h4><ul><li>Socket not available.</li></ul>';
      }
      break;
    case 'chat':
      contentArea.innerHTML = `
        <h3 class="dashboard-content-heading">Chat</h3>
        <p class="dashboard-content-paragraph">Connect with other players.</p>
        <!-- Add chat interface elements here -->
      `;
      break;
  }
}

// Add some CSS for the challenge modal and buttons
const style = document.createElement('style');
style.textContent = `
  .challenge-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1001; }
  .challenge-modal-content { background: #333; color: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 0 15px rgba(0,0,0,0.5); }
  .challenge-modal-actions button { margin: 10px; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; }
  .challenge-modal-actions button#acceptChallengeBtn { background-color: #4CAF50; color: white; }
  .challenge-modal-actions button#declineChallengeBtn { background-color: #f44336; color: white; }
  .dashboard-online-users li { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; }
  .dashboard-online-users .challenge-btn { padding: 3px 8px; font-size: 0.8em; margin-left: 10px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
  .dashboard-online-users .challenge-btn:disabled { background-color: #ccc; }
`;
document.head.appendChild(style);