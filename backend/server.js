
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
const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`✅ JS Server running at https://${HOST}:${PORT}`);
  } catch (e) {
    app.log.error(e);
    process.exit(1);
  }
};

start();