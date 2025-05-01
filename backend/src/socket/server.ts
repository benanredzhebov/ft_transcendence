// merged_backend_server.ts

import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';
import path from 'path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyCors from '@fastify/cors';
import { Server } from 'socket.io';

import { GameEngine } from '../game/GameEngine.ts';
import hashPassword from '../../crypto/crypto.ts'; // JS module, for now
import DB from '../../data_controller/dbConfig.ts'; // Still in JS

const PORT = 3000;

// Emulate __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load SSL certificates
const key = fs.readFileSync(path.join(__dirname, '../../src/ssl/key.pem'));
const cert = fs.readFileSync(path.join(__dirname, '../../src/ssl/cert.pem'));

const fastify = Fastify({
  logger: false,
  https: { key, cert },
});

const server = fastify.server;
const io = new Server(server, {
  cors: { origin: '*' },
});

// --- Game Logic (WebSocket + Game Loop) ---
const game = new GameEngine();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('player_move', ({ playerId, direction }) => {
    game.handlePlayerInput(playerId, direction);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

setInterval(() => {
  game.update(0.016);
  io.emit('state_update', game.getState());
}, 16);

// --- Middlewares ---
fastify.register(fastifyCors, { origin: true, credentials: true });
fastify.register(fastifyFormbody);
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/dist'),
  prefix: '/',
});

fastify.setNotFoundHandler((req, reply) => {
  reply.sendFile('index.html');
});

// Health check route (optional but helpful)
fastify.get('/', async (req, reply) => {
  reply.type('text/html').send(`
    <h1>Backend WebSocket Server is Running</h1>
    <p>Connected successfully to Fastify at <code>https://localhost:3000</code>.</p>
    <p>This server powers the real-time Pong game via WebSockets.</p>
  `);
});

// --- Routes ---
  fastify.get('/data', async (req, reply) => {
    try {
      const tables = await DB('credentialsTable');
      reply.send(tables);
    } catch (e) {
      console.error(e);
      reply.status(500).send({ error: 'Database fetch error' });
    }
  });

fastify.post('/signUp', async (req, reply) => {
  const { username, email, password: rawPassword } = req.body as any;
  if (!username || !email || !rawPassword) {
    reply.status(400).send({ error: 'All fields are required' });
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
    const id = await DB('credentialsTable').insert({ username, email, password });
    reply.status(201).send({ success: true, id: id[0] });
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Signup failed' });
  }
});

fastify.post('/login', async (req, reply) => {
  const { email, password } = req.body as any;
  if (!email || !password) {
    reply.status(400).send({ error: 'Email and password required' });
    return;
  }

  try {
    const user = await DB('credentialsTable').where({ email }).first();
    if (!user || user.password !== hashPassword(password)) {
      reply.status(401).send({ error: 'Invalid credentials' });
      return;
    }
    reply.send({ success: true, message: 'Login successful', userId: user.id });
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Login error' });
  }
});

fastify.post('/delete', async (req, reply) => {
  const { id } = req.body;
  if (!id) {
    reply.status(400).send({ error: 'ID is required' });
    return;
  }

  try {
    const deleted = await DB('credentialsTable').where({ id }).del();
    reply.send({ deleted });
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Delete error' });
  }
});

// --- Start Server ---
const start = async () => {
  try {
    await fastify.listen({ port: PORT });
    console.log(`✅ Server running at https://localhost:${PORT}`);
  } catch (e) {
    fastify.log.error(e);
    process.exit(1);
  }
};

start();