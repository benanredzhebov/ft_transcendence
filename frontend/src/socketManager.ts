import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const SOCKET_SERVER_URL = 'https://127.0.0.1:3000'; // Ensure this matches your backend server URL

export function connectSocket(token: string): Socket {
  if (socket && socket.connected) {
    // If already connected, potentially with an old token, disconnect first
    // or update auth. For simplicity, we'll disconnect and reconnect.
    socket.disconnect();
  }

  // Connect to the server with the authentication token
  socket = io(SOCKET_SERVER_URL, {
    auth: {
      token: token
    },
    // You might need to configure transports if you have issues connecting,
    // especially if there are proxies or specific network configurations.
    // transports: ['websocket', 'polling'], 
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // The server intentionally disconnected the socket
      // This might happen if authentication fails or token expires server-side
      socket?.connect(); // Optionally attempt to reconnect
    }
    // else the socket will automatically try to reconnect
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  // You can add more global socket event listeners here if needed

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null; // Clear the reference
    console.log('Socket explicitly disconnected.');
  }
}