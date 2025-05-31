import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const SOCKET_SERVER_URL = 'https://127.0.0.1:3000';

export function connectSocket(token: string): Socket {
  if (socket && socket.connected) {
    console.warn('Socket is already connected. Disconnecting existing socket before creating a new one.');
    socket.disconnect();
  }

  // Connect to the server with the authentication token
  socket = io(SOCKET_SERVER_URL, {
    auth: {
      token: token
    },
    // Use WebSocket transport??
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket?.id);
    if (socket?.id) {
      sessionStorage.setItem('socketId', socket.id);
      console.log('Socket ID stored in sessionStorage:', socket.id);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      console.warn('Server disconnected the socket. Attempting to reconnect...');
      socket?.connect();
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  //More global socket event listeners here if needed

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket explicitly disconnected.');
  }
}