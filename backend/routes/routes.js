
const path = require('path');
const DB = require('../data_controller/dbConfig.js');
const hashPassword = require('../crypto/crypto.js');
const {exchangeCodeForToken, fetchUserInfo} = require('../token_google/exchangeToken.js')
const jwt = require('jsonwebtoken');

// IMPORTANT: Store your secret in an environment variable in a real application!
const JWT_SECRET = process.env.JWT_SECRET || 'hbj2io4@@#!v7946h3&^*2cn9!@09*@B627B^*N39&^847,1';


const noHandlerRoute = (app) => {
	app.setNotFoundHandler((req, reply) => {
	reply.sendFile('index.html'); // Serve index.html from the root specified in fastifyStatic
});
}

// Fallback for SPA routing
// app.setNotFoundHandler((req, reply) => {
// 	reply.sendFile('index.html'); // Serve index.html from the root specified in fastifyStatic
// });


const developerRoutes = (app) => {

	app.get('/data', async (req, reply) => {
		try {
			const tables = await DB('credentialsTable');
			reply.send(tables);
		} catch (e) {
			console.error(e);
			reply.status(500).send({ error: 'Database fetch error' });
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
}

const credentialsRoutes = (app) =>{
  app.get('/api/profile', async (req, reply) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    try {
      const decodedToken = jwt.verify(token, JWT_SECRET);
      const userId = decodedToken.userId;

      if (!userId) {
        reply.status(401).send({ error: 'Unauthorized: Invalid token payload' });
        return;
      }

      const user = await DB('credentialsTable').where({ id: userId }).first();

      if (!user) {
        reply.status(404).send({ error: 'User not found' });
        return;
      }

      // JSON sending to frontend
      const userProfile = {
        username: user.username,
        email: user.email,
      };

      reply.send(userProfile); // Send profile data as JSON

    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        reply.status(401).send({ error: `Unauthorized: ${err.message}` });
      } else {
        console.error('Error fetching profile:', err);
        reply.status(500).send({ error: 'Server error while fetching profile' });
      }
    }
  });

  app.post('/signUp', async (req, reply) => {
    const { username, email, password: rawPassword } = req.body;
    if (!username || !email || !rawPassword) {
      reply.status(400).send({ error: 'All fields (username, email, password) are required' });
      return;
    }

    if (rawPassword.length < 8) {
      reply.status(400).send({ error: 'Password must be at least 8 characters long' });
      return;
    }

    try {
      //check if already exists
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
      // Generate token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username
      };
      // Sign the token - expires in 1 hour
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
      
      reply.send({
        success: true,
        message: 'Login successful',
        userId: user.id,
        username: user.username,
        token: token // Send token to frontend
      });    
    } catch (e) {
      console.error(e);
      reply.status(500).send({ error: 'Login failed due to server error' });
    }
  });


  app.get('/username-google', async (req, reply) => {
    const { code } = req.query; // Extract the authozation code from the query parameters

    if (!code) {
      reply.status(400).send({ error: 'Authorization code is missing' });
      return;
    }

    try {
      // Exchange the authorization code for an access token (implement this logic)
      const tokenResponse = await exchangeCodeForToken(code);
      const userInfo = await fetchUserInfo(tokenResponse.access_token);
      const {email, name} = userInfo;
      const existingUser = await DB('credentialsTable').where({ email }).first();
      if (!existingUser) {
        const username = name;
        let passwordBeforeHas = '##';
      const password = hashPassword(passwordBeforeHas);
        const [id] =  await DB('credentialsTable').insert({ email, username, password });
        const user = { id, email, username };

      }
      reply.redirect('/dashboard');

    } catch (e) {
      console.error(e);
      reply.status(500).send({ error: 'Failed to handle Google OAuth callback' });
    }
  });
}

module.exports = {developerRoutes, credentialsRoutes, noHandlerRoute};
