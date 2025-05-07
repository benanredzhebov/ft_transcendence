import './dashboard.css';
import { navigateTo } from './main';

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

// --- Helper Function to Set Active View ---
async function setActiveView(view: string, buttons: HTMLButtonElement[], contentArea: HTMLDivElement) {
	// Update button styles
	buttons.forEach(btn => {
	  if (btn.dataset.view === view) {
		btn.classList.add('active');
	  } else {
		btn.classList.remove('active');
	  }
	}
);

  // Update content area
  contentArea.innerHTML = '';
  switch (view) {
    case 'profile':
      contentArea.innerHTML = `<h3 class="dashboard-content-heading">Profile</h3><p class="dashboard-content-paragraph">Loading profile...</p>`; // Show loading state
      try {
        // Attempt to get the auth token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) {
          contentArea.innerHTML = `
            <h3 class="dashboard-content-heading">Profile</h3>
            <p class="dashboard-content-paragraph">Error: You are not logged in or your session has expired.</p>
            <p class="dashboard-content-paragraph">Please <a href="/login">login</a> again.</p>
          `;
		            return;
        }
		const response = await fetch('/api/profile', { // Replace with your actual API endpoint
			method: 'GET',
			headers: {
			  'Content-Type': 'application/json',
			  'Authorization': `Bearer ${token}` // Send the token in the Authorization header
			}
		  });
		
		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
			  contentArea.innerHTML = `
				<h3 class="dashboard-content-heading">Profile</h3>
				<p class="dashboard-content-paragraph">Error: Unauthorized. Your session may have expired.</p>
				<p class="dashboard-content-paragraph">Please <a href="/login">login</a> again.</p>
			  `;
			} else {
			  throw new Error(`API Error: ${response.status} ${response.statusText}`);
			}
			return;
		}

		const userProfile = await response.json();

        // Ensure userProfile has expected fields before trying to access them
        contentArea.innerHTML = `
          <h3 class="dashboard-content-heading">Profile</h3>
          <div class="profile-details">
            <p class="dashboard-content-paragraph"><strong>Username:</strong> ${userProfile.username || 'N/A'}</p>
            <p class="dashboard-content-paragraph"><strong>Email:</strong> ${userProfile.email || 'N/A'}</p>
            <p class="dashboard-content-paragraph"><strong>Member Since:</strong> ${userProfile.memberSince ? new Date(userProfile.memberSince).toLocaleDateString() : 'N/A'}</p>
            <p class="dashboard-content-paragraph"><strong>Games Played:</strong> ${userProfile.gamesPlayed !== undefined ? userProfile.gamesPlayed : 'N/A'}</p>
            <p class="dashboard-content-paragraph"><strong>Wins:</strong> ${userProfile.wins !== undefined ? userProfile.wins : 'N/A'}</p>
            <!-- Add more profile elements or an edit button here -->
          </div>
        `;
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