import { io, Socket } from "socket.io-client";
let socket: Socket | null = null;
export function getSocket() {
    if (!socket) {
        socket = io('https://127.0.0.1:3000', { transports: ['websocket'], secure: true });
    }
    return socket;
}
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}