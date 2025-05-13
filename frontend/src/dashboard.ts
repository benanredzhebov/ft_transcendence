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
      //*** Debugging logs
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
			  `;
			} else {
        throw new Error(`API Error: ${response.status} ${response.statusText}. Response: ${responseText}`);
			}
			return;
		}

		const userProfile = await response.json();

        contentArea.innerHTML = `
          <h3 class="dashboard-content-heading">Profile</h3>
          <div class="profile-details">
            <div class="profile-avatar-container">
              <img id="profileAvatar" src="${userProfile.avatar ? `data:image/jpeg;base64,${userProfile.avatar}` : '/images/default-avatar.png'}" alt="User Avatar" class="profile-avatar-img">
              <input type="file" id="avatarUpload" accept="image/jpeg, image/png, image/gif" style="display: none;">
              <button id="changeAvatarButton" class="dashboard-button">Change Picture</button>
            </div>
            <p class="dashboard-content-paragraph"><strong>Username:</strong> ${userProfile.username || 'N/A'}</p>
            <p class="dashboard-content-paragraph"><strong>Email:</strong> ${userProfile.email || 'N/A'}</p>
            <button id="uploadAvatarButton" class="dashboard-button" style="display: none;">Upload Selected</button>
            <p id="avatarUploadStatus" class="dashboard-content-paragraph" style="min-height: 1.2em;"></p>
          </div>
        `;
        const changeAvatarButton = contentArea.querySelector<HTMLButtonElement>('#changeAvatarButton');
        const avatarUploadInput = contentArea.querySelector<HTMLInputElement>('#avatarUpload');
        const uploadAvatarButton = contentArea.querySelector<HTMLButtonElement>('#uploadAvatarButton');
        const profileAvatarImg = contentArea.querySelector<HTMLImageElement>('#profileAvatar');
        const avatarUploadStatus = contentArea.querySelector<HTMLParagraphElement>('#avatarUploadStatus');

        if (changeAvatarButton && avatarUploadInput && uploadAvatarButton && profileAvatarImg && avatarUploadStatus) {
          changeAvatarButton.addEventListener('click', () => {
            avatarUploadInput.click(); // Trigger file input click
          });

          avatarUploadInput.addEventListener('change', () => {
            if (avatarUploadInput.files && avatarUploadInput.files.length > 0) {
              const file = avatarUploadInput.files[0];
              // Preview image (optional)
              const reader = new FileReader();
              reader.onload = (e) => {
                if (e.target && e.target.result) {
                  // profileAvatarImg.src = e.target.result as string; // Preview if desired
                }
              };
              reader.readAsDataURL(file);
              uploadAvatarButton.style.display = 'inline-block'; // Show upload button
              avatarUploadStatus.textContent = `Selected: ${file.name}`;
            } else {
              uploadAvatarButton.style.display = 'none';
              avatarUploadStatus.textContent = '';
            }
          });
          uploadAvatarButton.addEventListener('click', async () => {
            if (!avatarUploadInput.files || avatarUploadInput.files.length === 0) {
              avatarUploadStatus.textContent = 'Please select a file first.';
              return;
            }
            const file = avatarUploadInput.files[0];
            const formData = new FormData();
            formData.append('avatar', file); // 'avatar' must match the field name expected by backend

            avatarUploadStatus.textContent = 'Uploading...';
            uploadAvatarButton.disabled = true;

            try {
              const uploadResponse = await fetch('/api/profile/avatar', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  // 'Content-Type': 'multipart/form-data' is set automatically by browser with FormData
                },
                body: formData,
              });
              const result = await uploadResponse.json();
              console.log('Upload response from backend:', result); // Log the entire response
              console.log('profileAvatarImg element:', profileAvatarImg); // Check if the img element is found

              if (uploadResponse.ok && result.success) {
                avatarUploadStatus.textContent = 'Upload successful!';
                if (result.avatar && profileAvatarImg) { // *** SHOW PICTURE ***
                  const newSrc = `data:image/jpeg;base64,${result.avatar}`;
                  console.log('Setting new image src (first 100 chars):', newSrc.substring(0, 100) + '...');
                  profileAvatarImg.src = newSrc; // Update displayed avatar
                  console.log('Image src after update (first 100 chars):', profileAvatarImg.src.substring(0, 100) + '...');
                }
              } else {
                console.log('Either result.avatar is missing or profileAvatarImg element was not found.');
                if (!result.avatar) console.log('result.avatar is missing or empty.');
                if (!profileAvatarImg) console.log('profileAvatarImg element is null.');
              }
              uploadAvatarButton.style.display = 'none';

            } catch (uploadError) {
              console.error('Error uploading avatar:', uploadError);
              avatarUploadStatus.textContent = 'Upload error. See console.';
            } finally {
              uploadAvatarButton.disabled = false;
            }
          });
        }
      } catch (error) {
        console.error('HERE-Failed to fetch profile:', error);
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