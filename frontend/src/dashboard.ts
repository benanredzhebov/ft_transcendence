import './dashboard.css';
import { navigateTo } from './main';
import { disconnectSocket, getSocket } from './socketManager'; // Import getSocket

// Define predefined avatars (can be at module scope if preferred)
const PREDEFINED_AVATARS = [
  '/avatars/girl.png',
  '/avatars/boy.png',
  '/avatars/gojo.png',
  '/avatars/luffy.png'
];

// Module-level variable to hold the listener function and UI element for online users
let onlineUsersUpdateListener: ((users: { username: string }[]) => void) | null = null;
let onlineUsersListContainer: HTMLDivElement | null = null;
let onSocketConnectForDashboardListener: (() => void) | null = null; // New variable

export function renderDashboard() {
  const appElement = document.querySelector<HTMLDivElement>('#app');
  if (!appElement) {
    throw new Error('App root element (#app) not found!');
  }

  // Clear previous content
  appElement.innerHTML = '';

  // --- Create Elements ---

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
  nav.appendChild(logoutButton);

  // --- Assemble Card ---
  cardContainer.appendChild(sidebar);
  cardContainer.appendChild(contentArea);

  // --- Assemble Global Container ---
  globalContainer.appendChild(cardContainer);

  // --- Append to App ---
  appElement.appendChild(globalContainer);

  // --- Add Event Listeners ---

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
    localStorage.removeItem('authToken');
    disconnectSocket(); // Disconnect the socket on logout
    // Clean up dashboard-specific listeners if any were global to the dashboard itself
    const currentSocket = getSocket();
    if (currentSocket && onlineUsersUpdateListener) {
      currentSocket.off('online_users_update', onlineUsersUpdateListener);
      onlineUsersUpdateListener = null;
    }
    if (currentSocket && onSocketConnectForDashboardListener) {
      currentSocket.off('connect', onSocketConnectForDashboardListener);
      onSocketConnectForDashboardListener = null;
    }
    if (onlineUsersListContainer) {
      onlineUsersListContainer.remove();
      onlineUsersListContainer = null;
    }
    navigateTo('/');
  });

  // --- Initial View ---
  // Cleanup any listeners from a potential previous full render of the dashboard.
  const currentSocketOnInitialLoad = getSocket();
  if (currentSocketOnInitialLoad && onlineUsersUpdateListener) {
    currentSocketOnInitialLoad.off('online_users_update', onlineUsersUpdateListener);
    onlineUsersUpdateListener = null;
  }
  if (currentSocketOnInitialLoad && onSocketConnectForDashboardListener) {
    currentSocketOnInitialLoad.off('connect', onSocketConnectForDashboardListener);
    onSocketConnectForDashboardListener = null;
  }
  if (onlineUsersListContainer) {
    onlineUsersListContainer.remove();
    onlineUsersListContainer = null;
  }
  setActiveView('profile', navButtons, contentArea); // Set initial view to profile
}

// --- Helper Function to Open Avatar Selection Modal ---
async function openAvatarSelectionModal(
  token: string,
  currentProfileAvatarImg: HTMLImageElement,
  avatarStatusElement: HTMLParagraphElement
) {
  // Modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'avatar-modal-overlay';
  
  // Modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'avatar-modal-content';

  const modalTitle = document.createElement('h4');
  modalTitle.textContent = 'Choose Your Avatar';
  modalTitle.style.textAlign = 'center';
  modalTitle.style.marginBottom = '20px';

  const avatarsGrid = document.createElement('div');
  avatarsGrid.className = 'avatar-modal-grid';

  PREDEFINED_AVATARS.forEach(avatarSrc => {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'avatar-modal-option';
    const imgEl = document.createElement('img');
    imgEl.src = avatarSrc;
    imgEl.alt = `Avatar ${avatarSrc.split('/').pop()}`;
    imgEl.style.width = '80px';
    imgEl.style.height = '80px';
    imgEl.style.borderRadius = '50%';
    imgEl.style.objectFit = 'cover';
    imgEl.style.cursor = 'pointer';

    imgWrapper.appendChild(imgEl);
    imgWrapper.addEventListener('click', async () => {
      avatarStatusElement.textContent = 'Processing...';
      modalContent.style.pointerEvents = 'none'; // Disable further clicks during processing
      try {
        const imageResponse = await fetch(avatarSrc);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch avatar: ${imageResponse.statusText}`);
        }
        const imageBlob = await imageResponse.blob();
        const fileName = avatarSrc.split('/').pop() || 'avatar.png';
        const imageFile = new File([imageBlob], fileName, { type: imageBlob.type });

        const formData = new FormData();
        formData.append('avatar', imageFile);

        const uploadResponse = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        const result = await uploadResponse.json();

        if (uploadResponse.ok && result.success) {
          avatarStatusElement.textContent = 'Avatar updated successfully!';
          if (result.avatarPath) { // Check for avatarPath
            currentProfileAvatarImg.src = result.avatarPath; // Use the path directly
          }
        } else {
          avatarStatusElement.textContent = result.error || 'Failed to update avatar.';
          console.error('Avatar update error:', result);
        }
      } catch (error) {
        console.error('Error selecting/uploading predefined avatar:', error);
        avatarStatusElement.textContent = 'Error updating avatar. See console.';
      } finally {
        closeModal();
      }
    });
    avatarsGrid.appendChild(imgWrapper);
  });

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.className = 'avatar-modal-close-button';
  closeButton.addEventListener('click', closeModal);

  modalContent.appendChild(modalTitle);
  modalContent.appendChild(avatarsGrid);
  modalContent.appendChild(closeButton);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  function closeModal() {
    if (document.body.contains(modalOverlay)) {
      document.body.removeChild(modalOverlay);
    }
  }
  // Close modal if overlay is clicked
  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
        closeModal();
    }
  });
}

// --- Helper Function to Set Active View ---
async function setActiveView(view: string, buttons: HTMLButtonElement[], contentArea: HTMLDivElement) {
  // Update button styles
  buttons.forEach(btn => {
    if (btn.dataset.view === view) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // --- Cleanup listener and UI from previous 'game' view ---
  const currentSocket = getSocket();
  if (onlineUsersUpdateListener && currentSocket) {
    currentSocket.off('online_users_update', onlineUsersUpdateListener);
    onlineUsersUpdateListener = null;
    console.log("Removed previous online_users_update listener from dashboard.");
  }
  if (onSocketConnectForDashboardListener && currentSocket) { // Cleanup the new listener
    currentSocket.off('connect', onSocketConnectForDashboardListener);
    onSocketConnectForDashboardListener = null;
    console.log("Removed previous onSocketConnectForDashboardListener from dashboard.");
  }
  if (onlineUsersListContainer) {
    onlineUsersListContainer.remove();
    onlineUsersListContainer = null;
  }

  // Update content area
  contentArea.innerHTML = ''; // Clear previous content
  switch (view) {
    case 'profile':
      contentArea.innerHTML = `<h3 class="dashboard-content-heading">Profile</h3><p class="dashboard-content-paragraph">Loading profile...</p>`; // Show loading state
      try {
        // Get the token from local storage
        const token = localStorage.getItem('authToken');
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
        <h3 class="dashboard-content-heading">Game</h3>
        <p class="dashboard-content-paragraph">Ready to play or see who is online.</p>
      `;
      // Online Match Button
      const onlineButton = document.createElement('button');
      onlineButton.className = "dashboard-game-button";
      onlineButton.innerHTML = `<span>Play Online Match</span>`;
      onlineButton.addEventListener('click', () => navigateTo('/game'));
      gameContent.appendChild(onlineButton);

      // Local Match Button
      const localButton = document.createElement('button');
      localButton.className = "dashboard-game-button";
      localButton.innerHTML = `<span>Play Local Match</span>`;
      localButton.addEventListener('click', () => navigateTo('/game')); // Adjust if local game has a different route
      gameContent.appendChild(localButton);

      onlineUsersListContainer = document.createElement('div');
      onlineUsersListContainer.className = 'dashboard-online-users';
      onlineUsersListContainer.innerHTML = '<h4>Online Users:</h4><ul><li>Loading...</li></ul>';
      gameContent.appendChild(onlineUsersListContainer);
      contentArea.appendChild(gameContent);

      const socket = getSocket(); // Get socket instance

      if (socket) {
        console.log(`Dashboard 'game' view: Socket ID: ${socket.id}, Connected: ${socket.connected}`);

        onlineUsersUpdateListener = (users: { username: string }[]) => {
          if (!onlineUsersListContainer) return;
          console.log('Dashboard received online_users_update:', users);
          const ul = document.createElement('ul');
          if (users.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No users currently online.';
            ul.appendChild(li);
          } else {
            users.forEach(user => {
              const li = document.createElement('li');
              li.textContent = user.username;
              ul.appendChild(li);
            });
          }
          const heading = onlineUsersListContainer.querySelector('h4');
          onlineUsersListContainer.innerHTML = '';
          if (heading) onlineUsersListContainer.appendChild(heading);
          onlineUsersListContainer.appendChild(ul);
        };

        const setupOnlineUsersListener = () => {
          if (socket && onlineUsersUpdateListener && !socket.hasListeners('online_users_update')) {
            socket.on('online_users_update', onlineUsersUpdateListener);
            console.log("Attached online_users_update listener for dashboard game view.");
            // Your backend already emits the list when a new user connects,
            // so an explicit request here might be redundant but can be added if needed:
            // socket.emit('get_initial_online_users');
          }
        };

        if (socket.connected) {
          setupOnlineUsersListener();
        } else {
          if (onlineUsersListContainer) {
            onlineUsersListContainer.innerHTML = '<h4>Online Users:</h4><ul><li>Socket connecting...</li></ul>';
          }
          console.warn("Dashboard 'game' view: Socket not connected. Setting up listener for 'connect' event.");
          
          onSocketConnectForDashboardListener = () => {
            console.log("Dashboard 'game' view: Socket connected via onSocketConnectForDashboardListener. Setting up online users listener.");
            setupOnlineUsersListener();
            // Clean up this specific one-time connect listener
            if (socket && onSocketConnectForDashboardListener) {
              socket.off('connect', onSocketConnectForDashboardListener);
              onSocketConnectForDashboardListener = null;
            }
          };
          socket.on('connect', onSocketConnectForDashboardListener);
        }
      } else {
        if (onlineUsersListContainer) {
          onlineUsersListContainer.innerHTML = '<h4>Online Users:</h4><ul><li>Socket not available.</li></ul>';
        }
        console.error("Dashboard 'game' view: Socket instance not available.");
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