import { Socket } from 'socket.io-client';

export class LocalMatchMode {
	private socket: Socket | null = null;

	constructor(socket: Socket) {
		this.socket = socket;
	}

	public handleKeyPress(key: string, isKeyDown: boolean) {
		if (!this.socket) return;

		if (isKeyDown) {
			if (key === 'w') this.socket.emit('player_move', { playerId: 'player1', direction: 'up' });
			if (key === 's') this.socket.emit('player_move', { playerId: 'player1', direction: 'down' });
			if (key === 'arrowup') this.socket.emit('player_move', { playerId: 'player2', direction: 'up' });
			if (key === 'arrowdown') this.socket.emit('player_move', { playerId: 'player2', direction: 'down' });
		}
	}

	public cleanup() {
		// Cleanup for local match mode
	}
}