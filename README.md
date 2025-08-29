## to run with Docker

docker-compose up --build

## to run for testing

cd frontend
npm run build

cd backend
npm run dev

--------------------------------------------------------------------------


## deploy on 42 network

hostname -I | awk '{print $1}'

--------------------------------------------------------------------------


--------------------------------------------------------------------------


https://127.0.0.1:3000/username-google

client id : 532929311202-76tdduvrs9d0oied5k4ard52r7k8pq5t.apps.googleusercontent.com
client secret":"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"

const JWT_SECRET = process.env.JWT_SECRET || 'hbj2io4@@#!v7946h3&^*2cn9!@09*@B627B^*N39&^847,1';

--------------------------------------------------------------------

## Docker
 Free Up Disk Space
Delete unnecessary files in your home or project directories.
Check your disk usage
```df -h```

```docker system prune -af```
```docker volume prune -f```


## FIXED ISSUES
setInterval(() => {
    const isTwoPlayerGame = !game.isTournament && game.state.connectedPlayers.size === 2;
    const isAiGame = game.gameMode === 'ai' && game.state.connectedPlayers.size === 1;

    // Run the loop for a 2-player game OR an AI game.
    if (!game.paused && (isTwoPlayerGame || isAiGame)) {
        game.update();
        const state = game.getState();
        io.emit('state_update', state);
        if (state.gameOver) {
            console.log('Game over! Final score:', state.score);
            game.pause();
            game.resetGame(); // Reset immediately after game over
        }
    }
}, 1000 / 60);
