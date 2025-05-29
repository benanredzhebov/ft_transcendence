import './style.css';
import { renderLogin } from './login';
import { renderSignUp } from './signup';
import { renderDashboard } from './dashboard';
import { renderGame } from './game';
import getGoogleAuth from './GetGoogleAuth';
import { renderGoogle } from './google';
import { connectSocket } from './socketManager';


// --- DOM ---
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element (#app) not found!');
}

// --- Navigation Helper ---
// Uses the History API for path-based routing.
export function navigateTo(path: string) {
  if (window.location.pathname !== path) {
    history.pushState({}, '', path);
  }
  router(); // Manually trigger router to render the new view
}

// --- Handler for Google Auth Token ---
function handleGoogleAuthToken(): (() => void) | void {
  const queryParams = new URLSearchParams(window.location.search); // Use query parameters
  const token = queryParams.get('token');
  const error = queryParams.get('error');

  // Clean the URL by removing query parameters after processing
  if (token || error) {
    history.replaceState({}, '', window.location.pathname);
  }

  if (token) {
    sessionStorage.setItem('authToken', token);
    console.log('Google Auth Token stored successfully.');
    connectSocket(token); // Connect socket after Google Auth
    navigateTo('/dashboard');
  } else if (error) {
    console.error('Google authentication failed:', error);
    alert(`Google authentication failed: ${error}. Please try again.`);
    navigateTo('/login');
  } else {
    // This might be hit if /google-auth-handler is accessed directly without params
    console.warn('Google auth handler called without token or error. Redirecting to login.');
    navigateTo('/login');
  }
}

// --- Welcome Page ---
function renderWelcome(): (() => void) | void {
  app!.innerHTML = '';

  const container = document.createElement('div');
  container.className = "welcome-container";

  const card = document.createElement('div');
  card.className = "welcome-card";

  const title = document.createElement('h1');
  title.className = "welcome-title";
  title.innerHTML = `<br> <span>PONG</span>
    <a href="/dashboard" class="pong-play-link">▶</a>
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.className = "welcome-button-container";

  const loginButtonDiv = document.createElement('div');
  loginButtonDiv.innerHTML = `
    <a href="/login">
      <button class="welcome-button">
        Login
      </button>
    </a>
  `;

  const signupButtonDiv = document.createElement('div');
  signupButtonDiv.innerHTML = `
    <a href="/signUp">
      <button class="welcome-button">
        Signup
      </button>
    </a>
  `;

  const borderDiv = document.createElement('div');
  borderDiv.className = "login-border";

  const bottomParagraph = document.createElement('p');
  bottomParagraph.className = "login-bottom-paragraph";
  bottomParagraph.textContent = "or Sign in with";

  const googleLoginDiv = document.createElement('div');
  googleLoginDiv.style.textAlign = 'center';

  const googleLoginButton = document.createElement('button');
  googleLoginButton.className = "welcome-button google-login-button";
  googleLoginButton.style.width = 'auto';
  googleLoginButton.style.padding = '0.5em';
  googleLoginButton.style.lineHeight = '1';
  googleLoginButton.style.display = 'inline-block';

  const googleLogo = document.createElement('img');
  googleLogo.src = '/google.jpg'; // Ensure this path is correct relative to your public/static assets
  googleLogo.style.height = '30px';
  googleLogo.style.width = '30px';
  googleLogo.style.verticalAlign = 'center';

  googleLoginButton.appendChild(googleLogo);

  googleLoginButton.addEventListener('click', () => {
    const googleAuthUrl = getGoogleAuth();
    window.location.href = googleAuthUrl; // This will redirect to Google
  });
  googleLoginDiv.appendChild(googleLoginButton);

  buttonContainer.appendChild(loginButtonDiv);
  buttonContainer.appendChild(signupButtonDiv);
  buttonContainer.appendChild(borderDiv);
  buttonContainer.appendChild(bottomParagraph);
  buttonContainer.appendChild(googleLoginDiv);
  card.appendChild(title);
  card.appendChild(buttonContainer);
  container.appendChild(card);
  app!.appendChild(container);

  // Ensure all internal links are handled by the client-side router
  container.querySelectorAll('a[href^="/"]').forEach(anchor => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      const path = anchor.getAttribute('href');
      if (path) {
        navigateTo(path);
      }
    });
  });
}

// --- Router ---
const routes: { [key: string]: () => (() => void) | void } = {
  '/': renderWelcome,
  '/login': renderLogin,
  '/signUp': renderSignUp,
  '/username-google': renderGoogle,
  '/google-auth-handler': handleGoogleAuthToken, // This route will handle the redirect from Google
  '/game': renderGame,
  '/dashboard': renderDashboard,
};

let currentCleanupFunction: (() => void) | null = null;

function router() {
  if (currentCleanupFunction) {
    currentCleanupFunction();
    currentCleanupFunction = null;
  }

  const path = window.location.pathname || '/'; // Use pathname for routing
  const routeHandler = routes[path] || routes['/']; // Default to welcome page if route not found

  if (typeof routeHandler === 'function') {
    const cleanup = routeHandler();
    if (typeof cleanup === 'function') {
      currentCleanupFunction = cleanup;
    }
  } else {
    // Fallback for unknown routes (though current logic defaults to '/')
    console.warn(`No route handler found for path: ${path}. Displaying default page.`);
    // Optionally, render a specific 404 component here
    // app!.innerHTML = '<h1>404 - Page Not Found</h1><a href="/">Go Home</a>';
    // app!.querySelector('a[href="/"]')?.addEventListener('click', (e) => {
    //   e.preventDefault();
    //   navigateTo('/');
    // });
  }
}

// --- Event Listeners ---
// Listen for browser back/forward navigation
window.addEventListener('popstate', router);

// Initial routing on page load
window.addEventListener('load', router);

// The following block for DOMContentLoaded or document.readyState check
// is generally covered by the 'load' event listener above for initial routing.
// If you keep it, ensure it doesn't cause double routing.
// For simplicity, relying on 'load' is often sufficient.
// if (document.readyState === 'complete' || document.readyState === 'interactive') {
//   router();
// } else {
//   document.addEventListener('DOMContentLoaded', router);
// }