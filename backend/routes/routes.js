import { fileURLToPath } from 'url';
import path from 'path';
import DB from '../data_controller/dbConfig.js';
import hashPassword from '../crypto/crypto.js';
import { exchangeCodeForToken, fetchUserInfo } from '../token_google/exchangeToken.js';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'node:fs'; // For async file operations
import crypto from 'node:crypto'; // For generating unique filenames

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANT: Store it in an env.
const JWT_SECRET = process.env.JWT_SECRET || 'hbj2io4@@#!v7946h3&^*2cn9!@09*@B627B^*N39&^847,1';


// const noHandlerRoute = (app) => {
// 	app.setNotFoundHandler((req, reply) => {
// 	reply.sendFile('index.html'); // Serve index.html from the root specified in fastifyStatic
// });
// }

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
        avatar: user.avatar_path || null // Send avatar path
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

  // *** new: to get Match Data***
  app.get('/api/profile/matches', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);
    try {
      const decodedToken = jwt.verify(token, JWT_SECRET);
      const userId = decodedToken.userId;

      const matches = await DB('matchHistory')
        .where('player1_id', userId)
        .orWhere('player2_id', userId)
        .orderBy('match_date', 'desc')
        .limit(20);
      
      reply.send(matches);
    } catch (err) {
      console.error('Error fetching match history:', err);
      reply.status(500).send({ error: 'Server error while fetching match history' });
    }
  });

  app.post('/api/profile/avatar', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
    const userId = decodedToken.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token payload' });
    }

    const data = await req.file();

    if (!data || !data.file) {
      return reply.status(400).send({ error: 'No file uploaded or invalid format.' });
    }

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type. Only JPG, PNG, GIF allowed.' });
    }

    try {
      const buffer = await data.toBuffer();
      const fileExtension = path.extname(data.filename) || `.${data.mimetype.split('/')[1]}`;
      const uniqueFilename = `${userId}_${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
      const avatarFilePath = path.join(__dirname, '..', '..', 'uploads', 'avatars', uniqueFilename); // Adjusted path
      const avatarUrlPath = `/uploads/avatars/${uniqueFilename}`; // Path to be stored in DB and used by frontend

      await fs.writeFile(avatarFilePath, buffer);

      await DB('credentialsTable')
        .where({ id: userId })
        .update({ avatar_path: avatarUrlPath }); // Store the URL path

      console.log('Avatar path updated in DB for userId:', userId, 'to', avatarUrlPath);

      reply.send({ success: true, message: 'Avatar uploaded successfully.', avatarPath: avatarUrlPath }); // Send the path back
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.status(413).send({ error: 'File too large. Maximum size is 5MB.' });
      }
      reply.status(500).send({ error: 'Failed to upload avatar.' });
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
    const { code } = req.query;

    if (!code) {
      return reply.redirect('/login?error=google_auth_missing_code');
    }

    try {
      const tokenResponse = await exchangeCodeForToken(code);
      if (!tokenResponse || !tokenResponse.access_token) {
        console.error('Failed to exchange code for token or access_token missing:', tokenResponse);
        return reply.redirect('/login?error=google_token_exchange_failed');
      }
      const userInfo = await fetchUserInfo(tokenResponse.access_token);
      if (!userInfo || !userInfo.email) {
        console.error('Failed to fetch user info from Google or email missing:', userInfo);
        return reply.redirect('/login?error=google_user_info_failed');
      }

      const {email, name} = userInfo;
      let user = await DB('credentialsTable').where({ email }).first();

      if (!user) {
        const username = name || `user_${Date.now()}`; // Use Google name or a fallback
        // For Google-authenticated users, you might use a placeholder password
        // or a flag indicating Google auth, as they won't use this password to log in.
        const placeholderPassword = hashPassword(`google_auth_${email}_${Date.now()}`);
        const [id] =  await DB('credentialsTable').insert({
            email,
            username,
            password: placeholderPassword
            // Consider adding a field like 'auth_provider' and set it to 'google'
        });
        user = { id, email, username }; // Use the newly created user's details
      }

      // Generate JWT token for the user
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username
      };
      const jwtAuthToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

      reply.redirect(`/google-auth-handler?token=${jwtAuthToken}`);

    } catch (e) {
      console.error('Error during Google OAuth callback:', e);
      // Redirect to frontend login with a generic error
      reply.redirect('/login?error=google_auth_failed');
    }
  });
}

export {developerRoutes, credentialsRoutes};
