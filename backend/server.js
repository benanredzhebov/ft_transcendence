

const fs = require('fs');
const path = require('path');
const fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const fastifyFormbody = require('@fastify/formbody');
const fastifyCors = require('@fastify/cors');

// routes
const {developerRoutes, credentialsRoutes,noHandlerRoute} = require('./routes/routes'); // Import the routes

const {gameSockets} = require("./sockets/sockets");

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

// --- Middlewares ---
app.register(fastifyCors, { origin: true, credentials: true });
app.register(fastifyFormbody);

// Serve frontend static files
app.register(fastifyStatic, {
	root: path.join(__dirname, '../frontend/dist'), // Path to compiled frontend
	prefix: '/',
});



gameSockets(app);


//--------Routes------------
noHandlerRoute(app);
developerRoutes(app);
credentialsRoutes(app);
//-------------------------



const PORT = 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces

// --- Start Server ---
const start =  async () => {
	try{
		const address = await app.listen({ port: PORT, host: HOST });
		console.log("Server running " + address)
	}
	catch (e){
		app.log.error(e);
		process.exit(1);
	}

}

start();