import './style.css';
import { renderLogin } from './login';
import { renderSignUp } from './signup';
import { renderDashboard } from './dashboard';
import { renderGame } from './game';
import { renderGoogle } from './google';
import { connectSocket } from './socketManager';
import { renderWelcome } from './welcomePage';


// --- DOM ---
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element (#app) not found!');
}

// --- Navigation Helper ---
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
    localStorage.setItem('authToken', token);
    console.log('Google Auth Token stored successfully.');
    connectSocket(token); // Connect socket after Google Auth
    navigateTo('/dashboard');
  } else if (error) {
    console.error('Google authentication failed:', error);
    alert(`Google authentication failed: ${error}. Please try again.`);
    navigateTo('/login');
  } else {
    console.warn('Google auth handler called without token or error. Redirecting to login.');
    navigateTo('/login');
  }
}

// --- Router ---
const routes: { [key: string]: () => (() => void) | void } = {
  '/': () => renderWelcome(app!),
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
  const routeHandler = routes[path] || routes['/']; // Default to welcomePage if route not found

  if (typeof routeHandler === 'function') {
    const cleanup = routeHandler();
    if (typeof cleanup === 'function') {
      currentCleanupFunction = cleanup;
    }
  } else {
    console.warn(`No route handler found for path: ${path}. Displaying default page.`);
  }
}

// --- Event Listeners ---
// Listen for browser back/forward navigation
window.addEventListener('popstate', router);

// Initial routing on page load
window.addEventListener('load', router);
