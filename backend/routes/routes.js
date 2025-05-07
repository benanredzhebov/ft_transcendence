
const path = require('path');
const DB = require('../data_controller/dbConfig.js');
const hashPassword = require('../crypto/crypto.js');
const {exchangeCodeForToken, fetchUserInfo} = require('../token_google/exchangeToken.js')


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
    reply.send({ success: true, message: 'Login successful', userId: user.id });
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Login failed due to server error' });
  }
});


app.get('/username-google', async (req, reply) => {
  const { code } = req.query; // Extract the authorization code from the query parameters

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
	  reply.redirect('/#/dashboard');

  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: 'Failed to handle Google OAuth callback' });
  }
});
}

module.exports = {developerRoutes, credentialsRoutes, noHandlerRoute};