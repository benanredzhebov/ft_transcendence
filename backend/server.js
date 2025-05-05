
const fs = require('fs');
const repl = require("node:repl");
const DB = require('./data_controller/dbConfig.js');
const PORT = 3000;
const path = require('path');
const hasPassword = require('./crypto/crypto')



// https -- works
const fastify = require('fastify')({
	logger: false,
	// https: {
	// 	key: fs.readFileSync('./https_keys/private-key.pem'),
	// 	cert: fs.readFileSync('./https_keys/certificate.pem')
	// }
	https: {
    	key: fs.readFileSync(path.join(__dirname, 'https_keys/private-key.pem')),
    	cert: fs.readFileSync(path.join(__dirname, 'https_keys/certificate.pem'))
}
});

// const fastify = require('fastify')({
//     logger: false,
//     https: {
//         key: `-----BEGIN PRIVATE KEY-----
// MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDDhyul4hfPS+aD
// iRJjBkQS8vqbfVqKflvwFRjAbUxz5XXmUq86UGyVYw5jXyOLzTp4nO+YMcZ8q0B4
// 2k6gBfjMK3UG+NSTnHOq6jqn0h4R8FG/2jSVRhUxu9OdMUlK1p16tObKXL+Y6lcw
// aHcW9kp1L4LEeWcpGrjA9ZQ4ibCA0IgUIDtBUNp3DUYKm9HHJEEr7cTPNewENK+D
// MLQoVo6B1iup/bVyph/hN/KSNtpKRv4CiQz9hYb/9waydIqPhPWmD8WEfm+qa0n4
// sSIImTnUbUPpZdGIngLEhn9MEcu3LTKQ6F1qDmO/k6Af5n+0uCPwiUHj9YsfaD2U
// SG3VHeEjAgMBAAECggEAJ3EI2Pl2nBZPdZEc6GTHLptc+iibLvy2RwO6bnadyXMs
// CT38ouK+RJQqvtjeLsFDXjkqC6VeyJ8y7i37VkReH7FUdgeTugMBQiTlmBzGfA/i
// LbUyjjoI5HNjCH58rmAEfFApjgCPlaUP2W/5NeSQuHrRAhkLOjttsV7Ye18q/5C2
// rDGwp8h71STOstY8iQgs4UOLRfGopCcMmCNCMR2sNIyFE2/PDbB7PEa9Y4/1QOD9
// oKEpFhlSC+a2omWC1jBxVqMAxW+JH/9JZZSeJxh9YtlAKJn+gl6/GHqgzxhcsj6g
// O5m7Ym+e9VO3hwJ9xWZfOYpT+1hq+leFjh9HcZQ2IQKBgQDRVK4wjkvnD5kd99+7
// 4pLkWHOauVQZ6+9uSGNczkcuXq3f77yfUxmPvAhn3FgtTqNPRLMFnKL+5DtQm+zq
// ELAEbrU3ub2MjrT/J+TVSyrgIdWomGjKIKePDAcP6ui4OO/dAH+rTcipkMyBUszP
// EowkMpQUtCk8kdJT2DMliu80/wKBgQDvHrZX+WgutKrYYBj4ZTZjsSepKnfOuqEb
// Isr47DoHjzKkzjisNWa+1ob1ynKa/xTg02SYtGp35Ve9qE2926QTPQBnXTiqavGt
// BB0r5zUZa4MFoYDhXfI9q3OPGqaQEr2Or26GV9ttZzF0Qy9wz1PM7lbSc1WEpJ6q
// 9ikoq43f3QKBgQC1hrmHYd5wgRZG5q0eQV0gp5OYmR5VXERFXoDL+hXAIFqn1z26
// 7FU+T9D6QBo3L/puwyR7uVmfsEu/m3fXgqEhNt/vcyLswNQ0cGQAky6bLrwZeBFn
// NuoXIlb9drhZCQb4n3YXF1zrrqWpgCQbbfoZacMAMTuRSuMZ0mKIK/NEAQKBgGcD
// 6jaYYkPM3dV+AQPyRq5IQfflLdxIFuQj5yG6U32yOXU6yruV/f+1WEtHvnv77Li3
// GZ2YDE4+5b/1ZBipKVSIcUYWqTTyAdAx94dUglHDOZ0RaP6uhJAA7zX1m1ByYmu4
// NHt4GjZVwL5/u050Y3vkKk9cFLmiWiD5D95Pmj2ZAoGAfgsS4XX7M87Nj2RgO6Gw
// xopWQ5SseeVM+u1E/NZXuJB5J0MGv23+iigy0YRF3C5xLLnDDU9yzZNSgxIHzZfV
// 5utCMLyQSB3zKIepuRhVB7hZU+ATLECV6cXzsaidU9ROCeI+RFTp5OD9M3RCbx0s
// U8p2qasjfxZz0AZeXBQKRlM=
// -----END PRIVATE KEY-----`,
//         cert: `-----BEGIN CERTIFICATE-----
// MIIDazCCAlOgAwIBAgIUb3JI9Qbdr5Yla/6iWB8nSOc0smQwDQYJKoZIhvcNAQEL
// BQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
// GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNTA0MjkxNTMzNDFaFw0yNjA0
// MjkxNTMzNDFaMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
// HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
// AQUAA4IBDwAwggEKAoIBAQDDhyul4hfPS+aDiRJjBkQS8vqbfVqKflvwFRjAbUxz
// 5XXmUq86UGyVYw5jXyOLzTp4nO+YMcZ8q0B42k6gBfjMK3UG+NSTnHOq6jqn0h4R
// 8FG/2jSVRhUxu9OdMUlK1p16tObKXL+Y6lcwaHcW9kp1L4LEeWcpGrjA9ZQ4ibCA
// 0IgUIDtBUNp3DUYKm9HHJEEr7cTPNewENK+DMLQoVo6B1iup/bVyph/hN/KSNtpK
// Rv4CiQz9hYb/9waydIqPhPWmD8WEfm+qa0n4sSIImTnUbUPpZdGIngLEhn9MEcu3
// LTKQ6F1qDmO/k6Af5n+0uCPwiUHj9YsfaD2USG3VHeEjAgMBAAGjUzBRMB0GA1Ud
// DgQWBBSIT+hIOFyIWoN1u6gpW+II/1EQ+jAfBgNVHSMEGDAWgBSIT+hIOFyIWoN1
// u6gpW+II/1EQ+jAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQB5
// RveDxyVGnbm5xC5Fpf7TmxBhAQ3fVURLFxRDrDqLaEfHSo+ItF1SMt9mdCYt9xAa
// DRfrF5mHmSZuu8osuBavH7g0jI4fpuM0SIgmhl6dlATAuIdYkYi6kAjRoVGzHzfE
// dPauKxTH/umdbcFabTnN8SNm+o0NilUgr2H/dYZ9xSRlHuspUiX7HWYy+2Jpc+vl
// mXgfkfKJeyJzMgrP9yae7uXDFgvib6Yz24eWd+vsxrRlE//XFq34bLDQR4JAsF/g
// vJXt8Lg9UCwE/MvNev6oyw0jUE7nnOjWTyHFG0AJuowklEOdfOU2ZLZFY27Q/NC2
// NPvMFFwFgi9FdzI5vrpt
// -----END CERTIFICATE-----`
//     }
// });




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

const HOST = '0.0.0.0'; // Bind to all network interfaces
const start =  async () => {
	try{
		// const adress = await fastify.listen({port : PORT});
		const address = await fastify.listen({ port: PORT, host: HOST });

		console.log("Server running " + address)
	}
	catch (e){
		fastify.log.error(e);
		process.exit(1);
	}

}
start();

// https://localhost:3000/

