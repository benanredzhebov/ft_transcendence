import './dashboard.css';
import { navigateTo } from './main';
import { openAvatarSelectionModal } from './avatarModal';


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
                  <h4>Statistics</h4>
                  <ul>
                    ${matches.map((match: any) => `
                      <li>
                        <span>${match.player1_username} (${match.player1_score}) vs ${match.player2_username} (${match.player2_score})</span>
                        <strong class="${match.winner_id === userProfile.userId ? 'win' : 'loss'}">
                          ${match.winner_id === userProfile.userId ? 'Win' : 'Loss'}
                        </strong>
                      </li>
                    `).join('')}
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

        contentArea.innerHTML = `
          <h3 class="dashboard-content-heading">Profile</h3>
          <div class="profile-details">
            <div class="profile-avatar-container">
              <img id="profileAvatar" 
                   src="${userProfile.avatar || '/avatars/default.png'}" 
                   alt="User Avatar" 
                   class="profile-avatar-img" 
                   style="cursor: pointer;" 
                   title="Click to change avatar">
            </div>
            <p class="dashboard-content-paragraph"><strong>Username:</strong> ${userProfile.username || 'N/A'}</p>
            <p class="dashboard-content-paragraph"><strong>Email:</strong> ${userProfile.email || 'N/A'}</p>
            <p id="avatarUploadStatus" class="dashboard-content-paragraph" style="min-height: 1.2em; margin-top: 0.5rem;"></p>
          </div>
          ${matchHistoryHtml}
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
      gameContent.className = "dashboard-game-content"; // ***new***
      gameContent.innerHTML = `<h3 class="dashboard-content-heading">Choose your Game</h3>`;
      // Tournament Mode button
      const tournamentBtn = document.createElement('button');
      tournamentBtn.className = "dashboard-game-button";
      tournamentBtn.innerHTML = `<span>Tournament Mode</span>`;
      tournamentBtn.onclick = () => {
	      navigateTo('/game?tournament=true'); // it will trigger tournament flow from game.ts
      };
      gameContent.appendChild(tournamentBtn);

      // AI Match Button
      const aiButton = document.createElement('button');
      aiButton.className = "dashboard-game-button";
      aiButton.innerHTML = `<span>Play against AI</span>`;
      aiButton.addEventListener('click', () => navigateTo('/game?mode=ai'));
      gameContent.appendChild(aiButton);

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