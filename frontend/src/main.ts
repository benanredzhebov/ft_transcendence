import './style.css';
import { renderLogin } from './login';
import { renderSignUp } from './signup'; 
import { renderDashboard } from './dashboard';
import { renderGame } from './game'; 

// --- DOM ---
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element (#app) not found!');
}

function renderWelcome() {
  app!.innerHTML = '';

  const container = document.createElement('div');
  container.className = "welcome-container";

  const card = document.createElement('div');
  card.className = "welcome-card";

  const title = document.createElement('h1');
  title.className = "welcome-title";
  title.innerHTML = `<br> <span>PONG</span>
    <a href="#/dashboard" class="pong-play-link">▶</a>
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.className = "welcome-button-container";

  const loginButtonDiv = document.createElement('div');
  loginButtonDiv.innerHTML = `
    <a href="#/login">
      <button class="welcome-button">
        Login
      </button>
    </a>
  `;

  const signupButtonDiv = document.createElement('div');
  signupButtonDiv.innerHTML = `
    <a href="#/signUp">
      <button class="welcome-button">
        Signup
      </button>
    </a>
  `;

  buttonContainer.appendChild(loginButtonDiv);
  buttonContainer.appendChild(signupButtonDiv);
  card.appendChild(title);
  card.appendChild(buttonContainer);
  container.appendChild(card);
  app!.appendChild(container);
}


// --- Router ---
const routes: { [key: string]: () => void } = {
  '/': renderWelcome,
  '/login': renderLogin,
  '/signUp': renderSignUp,
  '/game': renderGame,
  '/dashboard': renderDashboard,
};

function router() {
  // Get the path from the hash, default to '/'
  const path = window.location.hash.slice(1) || '/';
  console.log("Navigating to:", path); // For debugging

  // Find the matching route or default to Welcome
  const renderFunction = routes[path] || renderWelcome;

  // Render the corresponding page
  renderFunction();
}

// --- Event Listeners ---
// Listen for hash changes to trigger routing
window.addEventListener('hashchange', router);

// Listen for initial page load
window.addEventListener('load', () => {
    // Set default hash if none exists
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    router(); // Render the initial page
});

// Ensure router runs even if hash doesn't change but page reloads
if (document.readyState === 'complete') {
    router();
}