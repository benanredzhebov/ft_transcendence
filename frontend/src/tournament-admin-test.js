// Tournament Admin Testing Utilities
// This file contains testing utilities for tournament management
// Add this script to browser console for testing admin functions

class TournamentAdmin {
    constructor(socket) {
        this.socket = socket;
    }

    // Reset tournament manually (for testing server restart scenarios)
    resetTournament() {
        const token = sessionStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }
        
        console.log('Sending tournament reset request...');
        this.socket.emit('admin_reset_tournament', { token });
    }

    // Test server disconnect simulation
    simulateServerDisconnect() {
        console.log('Simulating server disconnect...');
        this.socket.disconnect();
    }

    // Test reconnection
    reconnect() {
        console.log('Attempting reconnection...');
        this.socket.connect();
    }

    // Check current tournament state
    getTournamentInfo() {
        console.log('Socket connected:', this.socket.connected);
        console.log('Socket ID:', this.socket.id);
        console.log('Tournament mode from URL:', new URLSearchParams(window.location.search).get('tournament'));
    }
}

// Usage instructions:
console.log(`
Tournament Admin Testing Utilities Loaded

To use these testing functions in browser console:

1. Create admin instance:
   const admin = new TournamentAdmin(socket);

2. Available commands:
   admin.resetTournament() - Reset active tournament
   admin.simulateServerDisconnect() - Disconnect socket
   admin.reconnect() - Reconnect socket  
   admin.getTournamentInfo() - Show current state

3. Testing tournament reset during active match:
   - Start a tournament with 2+ players
   - Begin a match
   - Run admin.resetTournament() 
   - Should show proper tournament reset message

4. Testing server restart simulation:
   - Start a tournament
   - Run admin.simulateServerDisconnect()
   - Restart backend server manually
   - Should show proper reconnection with server restart detection
`);

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.TournamentAdmin = TournamentAdmin;
}
