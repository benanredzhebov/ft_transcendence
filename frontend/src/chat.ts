import { Socket } from 'socket.io-client';
import './chat.css';

interface OnlineUser {
  socketId: string;
  userId: number;
  username: string;
}

export function renderChat(socket: Socket): () => void {
  let selectedUser: OnlineUser | null = null; // selectedUser is now local to the render function

  const container = document.createElement('div');
  container.className = 'chat-container';

  const playerList = document.createElement('ul');
  playerList.className = 'chat-player-list';

  const chatArea = document.createElement('div');
  chatArea.className = 'chat-area';

  const messagesDiv = document.createElement('div');
  messagesDiv.className = 'chat-messages';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'chat-input';
  input.placeholder = 'Type a message';

  const sendBtn = document.createElement('button');
  sendBtn.className = 'chat-send-btn';
  sendBtn.textContent = 'Send';

  const blockBtn = document.createElement('button');
  blockBtn.className = 'chat-block-btn';
  blockBtn.textContent = 'Block Contact';
  blockBtn.disabled = true;

  const inviteBtn = document.createElement('button');
  inviteBtn.className = 'chat-invite-btn';
  inviteBtn.textContent = 'Invite for Match';
  inviteBtn.disabled = true;

  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'chat-controls';
  controlsDiv.appendChild(blockBtn);
  controlsDiv.appendChild(inviteBtn);
  controlsDiv.appendChild(sendBtn);

  chatArea.appendChild(messagesDiv);
  chatArea.appendChild(input);
  chatArea.appendChild(controlsDiv);

  container.appendChild(playerList);
  container.appendChild(chatArea);

  function appendMessage(sender: string, text: string) {
    const div = document.createElement('div');
    div.textContent = `${sender}: ${text}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll
  }

  // --- FIXED ISSUE: Show OnlineUser List - Authenticate the user for the chat ---
  const token = sessionStorage.getItem('authToken');
  if (token) {
    socket.emit('authenticate_chat', token);
  } else {
    appendMessage('System', 'Authentication token not found. Chat disabled.');
    console.error('Chat: No auth token found in sessionStorage.');
  }

  // Setup handlers
  socket.on('online_users', (users: OnlineUser[]) => {
    console.log('Received online users:', users); // DEBUGGING: Check if users are received
    playerList.innerHTML = '';
    users.forEach((u) => {
        const li = document.createElement('li');
        li.textContent = u.username;
        li.dataset.socketId = u.socketId;
        li.className = 'chat-user-item';
        // List item for each online user
        li.addEventListener('click', () => {
            // Clear selection styles from other users
            playerList.querySelectorAll('.chat-user-item').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');

            selectedUser = u;
            messagesDiv.innerHTML = ''; // Clear messages for new user
            appendMessage('System', `Chatting with ${selectedUser.username}`);
            blockBtn.disabled = false;
            inviteBtn.disabled = false;
      });
      playerList.appendChild(li);
    });
  });

  socket.on('private_message', ({ from, message, username }) => {
    if (selectedUser && from === selectedUser.socketId) {
      appendMessage(username, message);
    }
    // You might want to add a notification for messages from non-selected users
  });

  socket.on('game_invite', ({ username }) => {
    appendMessage('System', `${username} invited you to a game.`);
  });

  socket.on('match_announcement', (data: { player1: string; player2: string }) => {
    appendMessage('Tournament', `Next match: ${data.player1} vs ${data.player2}`);
  });

  socket.on('user_blocked', ({ message }) => {
    appendMessage('System', message);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    appendMessage('System', 'Error connecting to chat server.');
  });


  sendBtn.addEventListener('click', () => {
    if (selectedUser && input.value.trim()) {
      socket.emit('private_message', { targetSocketId: selectedUser.socketId, message: input.value.trim() });
      appendMessage('Me', input.value.trim());
      input.value = '';
    }
  });

  blockBtn.addEventListener('click', () => {
    if (selectedUser) {
      socket.emit('block_user', { targetUserId: selectedUser.userId });
      // The confirmation message should come from the server via 'user_blocked' event
    }
  });

  inviteBtn.addEventListener('click', () => {
    if (selectedUser) {
      socket.emit('invite_to_game', { targetSocketId: selectedUser.socketId });
      appendMessage('System', `Game invite sent to ${selectedUser.username}`);
    }
  });


  const root = document.querySelector('#dashboard-content');
  root?.appendChild(container);

  // Return a cleanup function
  return () => {
    // CRITICAL: Do NOT disconnect the socket here.
    // The socket is persistent and managed by the dashboard.
    container.remove();
  };
}