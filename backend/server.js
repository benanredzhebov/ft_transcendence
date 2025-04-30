
const fs = require('fs');
const repl = require("node:repl");
const DB = require('./data_controller/dbConfig.js');
const PORT = 3000;
const path = require('path');
const hasPassword = require('./crypto/crypto')

// https -- works
const fastify = require('fastify')({
	logger: false,
	https: {
		key: fs.readFileSync('./https_keys/private-key.pem'),
		cert: fs.readFileSync('./https_keys/certificate.pem')
	}
});

// -------------------------sockets fort game-------------


// npm install socket.io
const server = fastify.server; // Get the underlying HTTP/HTTPS server
const io = require('socket.io')(server);
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Example: Emit a dummy game state periodically
	const gameState = {
		paddles: {
			player1: { y: 100, height: 100, width: 10, speed: 7 },
			player2: { y: 200, height: 100, width: 10, speed: 7 },
		},
		ball: { x: 450, y: 300, radius: 10, dx: 5, dy: 4 },
		score: { player1: 0, player2: 0 }
	};
	socket.on('player_move', ({ playerId, direction }) => {
		const paddle = gameState.paddles[playerId];
		if (!paddle) return;
		// Move paddle up/down
		if (direction === 'up') paddle.y -= paddle.speed;
		if (direction === 'down') paddle.y += paddle.speed;
		// Clamp to field
		paddle.y = Math.max(0, Math.min(600 - paddle.height, paddle.y));
	});

	const interval = setInterval(() => {
		// Move the ball
		gameState.ball.x += gameState.ball.dx;
		gameState.ball.y += gameState.ball.dy;

		// Bounce off top/bottom
		if (gameState.ball.y < gameState.ball.radius || gameState.ball.y > 600 - gameState.ball.radius)
			gameState.ball.dy *= -1;
		// Bounce off left/right (for demo, reverse direction)
		if (gameState.ball.x < gameState.ball.radius || gameState.ball.x > 900 - gameState.ball.radius)
			gameState.ball.dx *= -1;

		socket.emit('state_update', gameState);
	}, 1000 / 60);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        clearInterval(interval);
    });
});
// --------------------------------------------------

//register the cores
//  for connecting with the forms
fastify.register(require('@fastify/cors'), {
	origin: true,
	credentials: true
  });



// for accepting html forms i need formbody
// npm install @fastify/formbody
fastify.register(require("@fastify/formbody"));
//register the static plugin
// npm install @fastify/static

// Serve the compiled frontend files
fastify.register(require('@fastify/static'), {
	root: path.join(__dirname, '../frontend/dist'), // Adjust path to the Vite build folder
	prefix: '/', // Serve files at the root URL
  });
  
  // Fallback to index.html for SPA routing
  fastify.setNotFoundHandler((req, reply) => {
	reply.sendFile('index.html'); // Ensure `index.html` exists in the `dist` folder
  });

//------------ routes --------------


fastify.get('/data', async (req, reply) => {
	try {
		const tables = await DB('credentialsTable'); // gets everything from the table testTable
		reply.send(tables)
	} catch (e) {
		console.log(e);
	}
});

// fastify.get('/signUp', (req, reply) => {
// 	reply.sendFile("signUp.html")
// });

// fastify.get('/logIn', (req, reply) => {
// 	reply.sendFile('logIn.html')
// });

// fastify.get('/delete', (req, reply) => {
// 	reply.sendFile("delete.html")
// });

// fastify.get('/game', (req, reply) => {
// 	reply.sendFile("pong.html")
// });

fastify.post('/signUp', async (req, reply) => {
	// Extract fields from the request body
	const { username, email} = req.body;
	let { password } = req.body;
	// Validate the input
	if (!username || !email || !password ) {
		reply.status(400).send({ error: 'All fields (username, email, password) are required' });
		return;
	}

	try {

		const usrUsername = await DB('credentialsTable').where({ username }).first();
		if(usrUsername){
			reply.status(400).send({ error: 'Username already exists' });
			return;
		}
		// make a check to see if the email already exists
		const userEmail = await DB('credentialsTable').where({ email }).first();
		if(userEmail){
			reply.status(400).send({ error: 'Email already in use!' });
			return;
		}
		// hash the password
		password = hasPassword(password);
		// Insert the data into the database
		const id = await DB('credentialsTable').insert({ username, email, password });

		// Send a success response with the inserted record's ID
		reply.status(201).send({ success: true, id: id[0] });
	} catch (e) {
		console.error(e);
		reply.status(500).send({ error: 'Failed to insert data' });
	}
});


fastify.post('/login', async (req, reply) => {
	const { email, password } = req.body;

	if (!email || !password) {
		reply.status(400).send({ error: 'Email and password are required' });
		return;
	}

	try {
		// Fetch the user from the database
		// checks if the email is in the db
		const user = await DB('credentialsTable').where({ email }).first();

		if (!user) {
			reply.status(404).send({ error: 'User not found' });
			return;
		}

		// Verify the password (assuming  is used for hashing)
		if (user.password !== hasPassword(password)) {
			reply.status(401).send({ error: 'Invalid password' });
			return;
		}

		// Respond with success
		reply.send({ success: true, message: 'Login successful', userId: user.id });
	} catch (error) {
		console.error(error);
		reply.status(500).send({ error: 'An error occurred during login' });
	}
});
// ----------------------------------------------------

/// ------------------for cleaning the data base---------------

fastify.post('/delete',async (req,reply) => {
	const { id } = req.body;  // body for forms, params for url
	if (!id) {
		reply.status(400).send({ error: 'ID is required' });
		return;
	}
	try{
		const currentTable = await DB("credentialsTable").where({id}).del();
		reply.send(currentTable);
		console.log("deleted");

	} catch (e) {
		console.log(e);
	}
});

// start the server

const start =  async () => {
	try{
		const adress = await fastify.listen({port : PORT});
		console.log("Server running " + "https://localhost:3000/")
	}
	catch (e){
		fastify.log.error(e);
		process.exit(1);
	}
}
start();

