
import './style.css';
import { renderWelcome } from './welcome';
import { renderLogin } from './login';
import { renderSignUp } from './signup';
import { renderDashboard } from './dashboard';
import { renderGame } from './game';
import { renderDelete } from './delete';
import { renderGoogle } from './google';
// --2fa--
import { renderTwoFA } from './twofa';  // import at the top


// --- DOM ---
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element (#app) not found!');
}

// --- Navigation Helper ---
export function navigateTo(path: string) {
  history.pushState({}, '', path);
  router();
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


// --- Router ---
const routes: { [key: string]: () => (() => void) | void } = { // render functions can return a cleanup function
  '/': renderWelcome,
  '/login': renderLogin,
  '/signUp': renderSignUp,
  '/google-auth-handler': handleGoogleAuthToken,
  '/game': renderGame,
  '/dashboard': renderDashboard,
  '/delete': renderDelete, // Add the delete route
  '/username-google': renderGoogle,
  '/2fa': renderTwoFA,


};

let currentCleanupFunction: (() => void) | null = null;

function router() {
  // Execute cleanup function of the previous view
  if (currentCleanupFunction) {
    currentCleanupFunction();
    currentCleanupFunction = null;
  }

  // Get the path from the pathname
  const path = window.location.pathname || '/';
  console.log("Navigating to:", path); // For debugging

  // Find the matching route or default to Welcome
  const renderFunction = routes[path] || routes['/'] || renderWelcome; // Ensure fallback

  // Render the corresponding page and store its cleanup function
  const cleanup = renderFunction();
  if (typeof cleanup === 'function') {
    currentCleanupFunction = cleanup;
  }
}

// --- Event Listeners ---
// Listen for popstate events (browser back/forward)
window.addEventListener('popstate', router);

// Listen for initial page load
window.addEventListener('load', () => {
    // Intercept clicks on all internal links
    document.body.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a[href^="/"]');
        if (anchor && anchor.getAttribute('href') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            const path = anchor.getAttribute('href');
            if (path) {
                navigateTo(path);
            }
        }
    });
    router(); // Render the initial page
});

// Ensure router runs if page was already loaded (e.g. script loaded async)
if (document.readyState === 'complete') {
    router();
}