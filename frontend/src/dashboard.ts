import './dashboard.css';
import { io } from 'socket.io-client';
import { navigateTo } from './main';

const PREDEFINED_AVATARS = [
  '/avatars/girl.png',
  '/avatars/boy.png',
	'/avatars/gojo.png',
	'/avatars/luffy.png'
];

export function getUserIdFromToken(): number | null {
  const token = localStorage.getItem('authToken');
  if (!token) return null;

  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    return payload.userId;
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}

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

  const friendsButton = document.createElement('button');
  friendsButton.className = "dashboard-nav-button";
  friendsButton.textContent = "Friends";
  friendsButton.dataset.view = "friends";

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
  nav.appendChild(friendsButton);
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
  const navButtons = [profileButton, friendsButton, gameButton, chatButton];
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

const socket = io('https://127.0.0.1:3000', { secure: true });

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

	const token = localStorage.getItem('authToken');
	if (!token) return;

	const headers = {
	'Content-Type': 'application/json',
	'Authorization': `Bearer ${token}`
	};

	const currentUserId = getUserIdFromToken();
	if (!currentUserId) return;
	
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

    <div id="chatFriendList" class="dashboard-subsection">
      <strong>Friends:(click addedd friends for more options)</strong><br>
      <div id="chatFriendEntries"></div>
    </div>

    <div id="chatHistory" class="dashboard-subsection" style="height: 200px; overflow-y: auto; background-color: #1f2937; color: white;"></div>

    <div class="dashboard-subsection">
      <input type="text" id="chatMessageInput" class="dashboard-input" placeholder="Type your message..." />
      <button id="chatSendBtn" class="dashboard-game-button">Send</button>
    </div>
  `;

  const chatFriendEntries = document.getElementById('chatFriendEntries')!;
  const chatHistory = document.getElementById('chatHistory')!;
  const messageInput = document.getElementById('chatMessageInput') as HTMLInputElement;
  const sendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement;

  let selectedFriendId: number | null = null;

  const friendRes = await fetch(`/friend/list/${currentUserId}`, { headers });
  const friends = await friendRes.json();

 friends.forEach((f: any) => {
  const div = document.createElement('div');
  div.className = 'friend-entry';
  div.textContent = f.username;
  div.style.cursor = 'pointer';
  div.style.margin = '4px 0';

  div.addEventListener('click', () => {
    selectedFriendId = f.id;
    loadChatHistory(selectedFriendId!);

	socket.off('message_received'); // prevent duplicates
	socket.on('message_received', (data) => {
		console.log('💬 Real-time message received:', data);

	if (data.from !== selectedFriendId && data.to !== selectedFriendId) return;
	const div = document.createElement('div');
	const sender = data.from === currentUserId ? '🟢 You' : `🟡 ${data.from}`;
	div.innerHTML = `<strong>${sender}:</strong> ${data.content}`;
	chatHistory.appendChild(div);
	chatHistory.scrollTop = chatHistory.scrollHeight;
	});


    const action = prompt(`Options for ${f.username}:\n- Type 'chat' to message\n- Type 'block'\n- Type 'unfriend'\n- Type 'game' to start local game`);

    if (action === 'block') {
      socket.emit('friend_block', { blockerId: currentUserId, blockedId: f.id });
    } else if (action === 'unfriend') {
      socket.emit('friend_unfriend', { userId: currentUserId, friendId: f.id });
    } else if (action === 'game') {
      socket.emit('start_game_with_friend', { friendId: f.id });
	socket.on('game_start', ({ roomId }) => {
	localStorage.setItem('gameRoomId', roomId);
	navigateTo('/game');
	});

    }
  });

  chatFriendEntries.appendChild(div); // ✅ Fix: use the variable
});

  async function loadChatHistory(friendId: number) {
    const historyRes = await fetch(`/api/message/history?user1=${currentUserId}&user2=${friendId}`, { headers });
    const messages = await historyRes.json();
    chatHistory.innerHTML = messages.map((msg: any) => {
      const direction = msg.sender_id === currentUserId ? '🟢 You' : `🟡 ${msg.sender_id}`;
      return `<div><strong>${direction}:</strong> ${msg.content}</div>`;
    }).join('');
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
  socket.emit('register', currentUserId);

	
  sendBtn.addEventListener('click', async () => {
    if (!selectedFriendId) return;
    const content = messageInput.value.trim();
    if (!content) return;
    socket.emit('private_message', {
      from: currentUserId,
      to: selectedFriendId,
      content
    });
    messageInput.value = '';
    // loadChatHistory(selectedFriendId);
  });
  break;
	case 'friends':
  contentArea.innerHTML = `
    <h3 class="dashboard-content-heading">Friends</h3>

    <!-- Friend Search -->
    <div class="dashboard-subsection">
      <input type="text" id="friendSearchInput" class="dashboard-input" placeholder="Search users by username or email">
      <button id="friendSearchBtn" class="dashboard-game-button">Search</button>
      <div id="friendSearchResults" class="dashboard-search-results"></div>
    </div>

    <!-- Friend List -->
    <div id="friendList" class="dashboard-subsection">
      <strong>Your Friends:</strong><br>
      <p>Loading...</p>
    </div>

    <!-- Pending Requests -->
    <div id="pendingRequests" class="dashboard-subsection">
      <strong>Pending Friend Requests:</strong><br>
      <p>Loading...</p>
    </div>
  `;

  const searchBtn = document.getElementById('friendSearchBtn') as HTMLButtonElement;
  searchBtn?.addEventListener('click', async () => {
    const input = (document.getElementById('friendSearchInput') as HTMLInputElement).value.trim();
    const resultsDiv = document.getElementById('friendSearchResults');
    if (!input || !resultsDiv) return;
    resultsDiv.innerHTML = 'Searching...';

    const res = await fetch(`/api/user/search?q=${encodeURIComponent(input)}`, { headers });
    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      resultsDiv.innerHTML = `<p>No users found.</p>`;
      return;
    }

    resultsDiv.innerHTML = '';
    users.forEach((user: any) => {
      if (user.id === currentUserId) return;
      const item = document.createElement('div');
      item.textContent = `${user.username} (${user.email})`;
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add';
      addBtn.className = 'dashboard-game-button';
      addBtn.style.marginLeft = '1rem';

      addBtn.addEventListener('click', async () => {
        const res = await fetch('/friend/add', {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId: currentUserId, friendId: user.id })
        });
        const json = await res.json();
        alert(json.message || json.error || 'Friend request sent');
      });

      item.appendChild(addBtn);
      resultsDiv.appendChild(item);
    });
  });

  // Load friend list
  const friendListDiv = document.getElementById('friendList');
  async function refreshFriendList() {
    const res = await fetch(`/friend/list/${currentUserId}`, { headers });
    const data = await res.json();
    friendListDiv!.innerHTML = Array.isArray(data) && data.length > 0
      ? data.map((f: any) => `🟢 ${f.username} (${f.id})`).join('<br>')
      : `<p>No friends yet.</p>`;
  }
  refreshFriendList();

  // Load pending requests
  const pendingDiv = document.getElementById('pendingRequests');
  async function loadPendingRequests() {
    const res = await fetch(`/friend/pending/${currentUserId}`, { headers });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      pendingDiv!.innerHTML = `<p>No pending requests.</p>`;
      return;
    }

    pendingDiv!.innerHTML = '';
    data.forEach((req: any) => {
      const entry = document.createElement('div');
      entry.className = 'dashboard-pending-entry';
      entry.setAttribute('data-user-id', req.user_id); // for realtime removal

      entry.innerHTML = `<span>⏳ ${req.username} (${req.email})</span>`;

      const acceptBtn = document.createElement('button');
      acceptBtn.textContent = 'Accept';
      acceptBtn.className = 'dashboard-game-button';
      acceptBtn.style.marginLeft = '1rem';

      acceptBtn.addEventListener('click', () => {
        socket.emit('friend_accept', {
          fromUserId: req.user_id,
          toUserId: currentUserId,
        });
      });

      entry.appendChild(acceptBtn);
      pendingDiv!.appendChild(entry);
    });
  }
  loadPendingRequests();

  // 🔄 Listen for realtime acceptance (you or someone else accepted it)
socket.on('friend_accepted', async ({ by }) => {
  if (!by || !currentUserId) return;

  // ✅ Remove from pending
  const entryToRemove = document.querySelector(`.dashboard-pending-entry[data-user-id="${by}"]`);
  if (entryToRemove && entryToRemove.parentNode) {
    entryToRemove.parentNode.removeChild(entryToRemove);
  }
  refreshFriendList?.();
});
  break;
};

}