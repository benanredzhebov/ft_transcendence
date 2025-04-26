
const fs = require('fs');
const repl = require("node:repl");
const DB = require('./data_controller/dbConfig.js');
const PORT = process.env.PORT || 3000;
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
// const server = fastify.server; // Get the underlying HTTP/HTTPS server
// const io = require('socket.io')(server);
//
// io.on('connection', (socket) => {
// 	console.log('A user connected');
// 	socket.on('player_move', (data) => {
// 		console.log('Player move:', data);
// 	});
//
// 	setInterval(() => {
// 		socket.emit('state_update', {
// 			paddles: {
// 				player1: { y: 100, height: 100 },
// 				player2: { y: 200, height: 100 },
// 			},
// 			ball: { x: 450, y: 300, radius: 10 },
// 		});
// 	}, 1000 / 60); // 60 FPS
// });
//
// // --------------------------------------------------





// for accepting html forms i need formbody
// npm install @fastify/formbody
fastify.register(require("@fastify/formbody"));
//register the static plugin
// npm install @fastify/static
// -------------c0onnect with react server----------
fastify.register(require('@fastify/static'), {
	root: path.join(__dirname, '../frontend/dist'), // Serve React build files
	prefix: '/', // Serve files at the root URL
});
//
fastify.setNotFoundHandler((req, reply) => {
	reply.sendFile('index.html'); // Ensure `index.html` exists in thesrc directory
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


fastify.post('/logIn', async (req, reply) => {
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
	// reply.sendFile('delete.html'); // File must exist in the 'public' folder
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
		console.log("Server running " + adress)
	}
	catch (e){
		fastify.log.error(e);
		process.exit(1);
	}
}




// ----------------------test for game-----------------
// npm install @fastify/cors
// fastify.register(require('@fastify/cors'), {
// 	origin: 'http://localhost:5173', // Replace with your frontend's URL
// });
// let io; // Declare io globally
//
// const start = async () => {
// 	try {
// 		const address = await fastify.listen({ port: PORT });
// 		console.log("Server running at " + address);
//
// 		// Attach socket.io to the Fastify server
// 		io = require('socket.io')(fastify.server, {
// 			cors: {
// 				origin: 'http://localhost:5173', // Replace with your frontend's URL
// 				methods: ['GET', 'POST'],
// 			},
// 		});
//
// 		io.on('connection', (socket) => {
// 			console.log('A user connected');
// 			socket.on('player_move', (data) => {
// 				console.log('Player move:', data);
// 			});
//
// 			setInterval(() => {
// 				socket.emit('state_update', {
// 					paddles: {
// 						player1: { y: 100, height: 100 },
// 						player2: { y: 200, height: 100 },
// 					},
// 					ball: { x: 450, y: 300, radius: 10 },
// 				});
// 			}, 1000 / 60); // 60 FPS
// 		});
// 	} catch (e) {
// 		fastify.log.error(e);
// 		process.exit(1);
// 	}
// };
// ----------------------------

start();