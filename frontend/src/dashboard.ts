import './dashboard.css';
import { navigateTo } from './main';

// Define predefined avatars (can be at module scope if preferred)
const PREDEFINED_AVATARS = [
  '/avatars/girl.png',
  '/avatars/boy.png',
	'/avatars/gojo.png',
	'/avatars/luffy.png'
];

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
  nav.appendChild(logoutButton); // Add logout button to nav

  sidebar.appendChild(sidebarHeading);
  sidebar.appendChild(nav);

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
    navigateTo('/');
  });

  // --- Initial View ---
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

  // Update content area
  contentArea.innerHTML = '';
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
        <p class="dashboard-content-paragraph">Matchmaking with online players.</p>
      `;
      // Tournament Mode button
      const tournamentBtn = document.createElement('button');
      tournamentBtn.className = "dashboard-game-button";
      tournamentBtn.innerHTML = `<span>Tournament Mode</span>`;
      tournamentBtn.onclick = () => {
	      navigateTo('/game?tournament=true'); // it will trigger tournament flow from game.ts
      };
      gameContent.appendChild(tournamentBtn);

      // Online Match Button
      const onlineButton = document.createElement('button');
      onlineButton.className = "dashboard-game-button";
      onlineButton.innerHTML = `<span>Online Match</span>`;
      onlineButton.addEventListener('click', () => navigateTo('/game'));
      gameContent.appendChild(onlineButton);

      // Local Match Button
      const localButton = document.createElement('button');
      localButton.className = "dashboard-game-button";
      localButton.innerHTML = `<span>Local Match</span>`;
      localButton.addEventListener('click', () => navigateTo('/game')); // Or a different route/logic for local
      gameContent.appendChild(localButton);
      contentArea.appendChild(gameContent);
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