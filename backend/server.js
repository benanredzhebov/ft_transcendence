
const fs = require('fs');
const repl = require("node:repl");
const DB = require('./data_controller/dbConfig.js');
const PORT = process.env.PORT || 3000;

const hasPassword = require('./crypto/crypto')

// https -- works
const fastify = require('fastify')({
	logger: false,
	https: {
		key: fs.readFileSync('./https_keys/private-key.pem'),
		cert: fs.readFileSync('./https_keys/certificate.pem')
	}
});


// import new knex db;
// const db = require('./data/dbConfig');
// iport the path
const path = require('path');

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

// fastify.register(require('@fastify/static'), {
// 	root: path.join(__dirname, './public'), // Serve React build files
// 	prefix: '/', // Serve files at the root URL
// });


//------------ routes --------------


fastify.get('/data', async (req, reply) => {
	try {
		const tables = await DB('credentialsTable'); // gets everything from the table testTable
		reply.send(tables)
	} catch (e) {
		console.log(e);
	}
});
//
// // // Example route to serve the signUp.html file explicitly
fastify.get('/signUp', (req, reply) => {
	reply.sendFile('signUp.tsx'); // File must exist in the 'public' folder
});
//
// fastify.get('/logIn', (req, reply) => {
// 	reply.sendFile('login.html'); // File must exist in the 'public' folder
// });
//
//
// fastify.get('/delete', (req, reply) => {
// 	reply.sendFile('delete.html'); // File must exist in the 'public' folder
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
		// make a check to see if the email already exists
		// const user = await DB('credentialsTable').where({ email }).first();

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

		// Verify the password (assuming `hasPassword` is used for hashing)
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

start();