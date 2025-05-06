


const fs = require('fs');
const path = require('path');
const fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const fastifyFormbody = require('@fastify/formbody');
const fastifyCors = require('@fastify/cors');
const { Server } = require('socket.io');

const GameEngine = require('./gamelogic/GameEngine.js');
const hashPassword = require('./crypto/crypto.js');
const DB = require('./data_controller/dbConfig.js');

const PORT = 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces

// Load SSL certificates
const keyPath = path.join(__dirname, 'https_keys/private-key.pem');
const certPath = path.join(__dirname, 'https_keys/certificate.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error(`Error: SSL certificate files not found at ${keyPath} or ${certPath}.`);
  console.error('Please ensure the certificates exist or adjust the paths in server.js.');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

const app = fastify({
  logger: false,
  https: httpsOptions,
});

const server = app.server; // Get the underlying HTTPS server
const io = new Server(server, {
  cors: { origin: '*' }, // Allow all origins for Socket.IO
});

// ***** Game Logic (WebSocket + Game Loop)*******
const game = new GameEngine();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('player_move', ({ playerId, direction }) => {
    game.handlePlayerInput(playerId, direction);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Handle player disconnection in the game engine if necessary
    // game.removePlayer(socket.id);
  });
});

// Game loop
setInterval(() => {
  game.update(1 / 60);
  io.emit('state_update', game.getState());
}, 1000 / 60); // 60 times per second

// --- Middlewares ---
app.register(fastifyCors, { origin: true, credentials: true });
app.register(fastifyFormbody);

// Serve frontend static files
app.register(fastifyStatic, {
  root: path.join(__dirname, '../frontend/dist'), // Path to compiled frontend
  prefix: '/',
});

// Fallback for SPA routing
app.setNotFoundHandler((req, reply) => {
  reply.sendFile('index.html'); // Serve index.html from the root specified in fastifyStatic
});

// Health check route (optional but helpful)
app.get('/health', async (req, reply) => {
  reply.type('text/html').send(`
    <h1>Backend Server is Running (JS)</h1>
    <p>Fastify server is active at <code>https://${HOST}:${PORT}</code>.</p>
    <p>Socket.IO is listening for connections.</p>
  `);
});

// --- API Routes ---
app.get('/data', async (req, reply) => {
  try {
    const tables = await DB('credentialsTable');
    reply.send(tables);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Database fetch error' });
  }
});

app.post('/signUp', async (req, reply) => {
  const { username, email, password: rawPassword } = req.body;
  if (!username || !email || !rawPassword) {
    reply.status(400).send({ error: 'All fields (username, email, password) are required' });
    return;
  }

  try {
    const exists = await DB('credentialsTable')
      .where({ username })
      .orWhere({ email })
      .first();
    if (exists) {
      reply.status(400).send({ error: 'Username or email already in use' });
      return;
    }

    const password = hashPassword(rawPassword);
    const [id] = await DB('credentialsTable').insert({ username, email, password });
    reply.status(201).send({ success: true, id: id });
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Signup failed due to server error' });
  }
});

app.post('/login', async (req, reply) => {
  const { email, password: rawPassword } = req.body;
  if (!email || !rawPassword) {
    reply.status(400).send({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await DB('credentialsTable').where({ email }).first();
    if (!user || user.password !== hashPassword(rawPassword)) {
      reply.status(401).send({ error: 'Invalid email or password' });
      return;
    }
    reply.send({ success: true, message: 'Login successful', userId: user.id });
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Login failed due to server error' });
  }
});

app.post('/delete', async (req, reply) => {
  const { id } = req.body;
  if (!id || typeof id !== 'number') { // Basic validation
    reply.status(400).send({ error: 'A valid numeric ID is required' });
    return;
  }

  try {
    const deletedCount = await DB('credentialsTable').where({ id }).del();
    if (deletedCount > 0) {
        reply.send({ success: true, message: `User with ID ${id} deleted.` });
    } else {
        reply.status(404).send({ success: false, message: `User with ID ${id} not found.` });
    }
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Delete operation failed due to server error' });
  }
});

// --- Start Server ---
const start =  async () => {
	try{
		// const adress = await fastify.listen({port : PORT});
		const address = await app.listen({ port: PORT, host: HOST });

		console.log("Server running " + address)
	}
	catch (e){
		app.log.error(e);
		process.exit(1);
	}

}

start();