import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const SOCKET_SERVER_URL = 'https://127.0.0.1:3000';

export function connectSocket(token: string): Socket {
  if (socket && socket.connected) {
    // If socket exists and is connected, but we're trying to connect again (e.g. re-login)
    // It's often better to update auth or ensure it's the same user.
    // For simplicity here, if token changes or forcing re-auth, disconnect and reconnect.
    if (socket.auth && (socket.auth as any).token !== token) {
        socket.disconnect();
        socket = null; // Force new instance
    } else {
        console.log('Socket already connected and authenticated with the same token.');
        return socket;
    }
  }
  if (socket && !socket.connected) { // Exists but not connected
    socket.auth = { token };
    socket.connect();
    return socket;
  }
  if (!socket) { // No socket instance yet
    socket = io(SOCKET_SERVER_URL, {
      auth: {
        token: token
      },
      transports: ['websocket'], // Good to be explicit
      // autoConnect: false, // Can be true if you want it to try connecting immediately
    });
  }

  // General listeners for the shared socket
  socket.off('connect'); // Remove previous before adding
  socket.on('connect', () => {
    console.log('SocketManager: Socket connected successfully:', socket?.id);
    // You could emit a global event here if other modules need to know
    // window.dispatchEvent(new CustomEvent('socketConnected'));
  });

  socket.off('disconnect');
  socket.on('disconnect', (reason) => {
    console.log('SocketManager: Socket disconnected:', reason);
    // window.dispatchEvent(new CustomEvent('socketDisconnected', { detail: reason }));
    if (reason === 'io server disconnect') {
      // The server intentionally disconnected the socket (e.g. auth failure on server side)
      // Potentially clear auth token from localStorage and navigate to login
    }
    // Socket.IO client will automatically try to reconnect for most other reasons
  });

  socket.off('connect_error');
  socket.on('connect_error', (err) => {
    console.error('SocketManager: Socket connection error:', err.message);
    // window.dispatchEvent(new CustomEvent('socketConnectError', { detail: err }));
  });

  if (!socket.connected) {
    socket.connect(); // Explicitly connect if not already trying
  }

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    // socket = null; // Keep the instance for potential re-connect, or nullify if truly done
    console.log('SocketManager: Socket explicitly disconnected by disconnectSocket().');
  }
}