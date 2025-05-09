import './style.css';
import { renderLogin } from './login';
import { renderSignUp } from './signup';
import { renderDashboard } from './dashboard';
import { renderGame } from './game';
import { renderDelete } from './delete';
import getGoogleAuth from './GetGoogleAuth'; // Import the function
import { renderGoogle } from './google';
// import {createTestPage} from './test.ts'

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

  // Border
  const borderDiv = document.createElement('div');
  borderDiv.className = "login-border"; // Use CSS class

  // Bottom Content "or log in with"
  const bottomParagraph = document.createElement('p');
  bottomParagraph.className = "login-bottom-paragraph"; // Use CSS class
  bottomParagraph.textContent = "or Sign in with";

  const googleLoginDiv = document.createElement('div');
  // Center the button within its div
  googleLoginDiv.style.textAlign = 'center'; 
  
  const googleLoginButton = document.createElement('button');
  googleLoginButton.className = "welcome-button google-login-button"; 
  // Override styles from "welcome-button" to make it smaller
  googleLoginButton.style.width = 'auto'; // Fit content
  googleLoginButton.style.padding = '0.5em'; // Smaller padding
  googleLoginButton.style.lineHeight = '1'; // Adjust line height for icon
  googleLoginButton.style.display = 'inline-block'; // Allow width auto
  const googleSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  googleSvg.setAttribute("viewBox", "0 0 48 48");
  googleSvg.innerHTML = `<path fill="EA4335" d="M24 9.5c3.4 0 6.3 1.2 8.6 3.2l6.4-6.4C34.9 2.8 29.9 1 24 1 14.9 1 7.1 6.6 3.4 14.4l7.7 6C12.8 13.4 18 9.5 24 9.5z"/><path fill="4285F4" d="M46.5 24.5c0-1.8-.2-3.5-.5-5.2H24v9.9h12.7c-.6 3.2-2.3 5.9-4.9 7.8l7.7 6c4.5-4.1 7-10.1 7-17.5z"/><path fill="FBBC05" d="M11.1 20.4c-.5 1.5-.8 3.1-.8 4.8s.3 3.3.8 4.8l-7.7 6C1.2 31.6 0 28 0 24s1.2-7.6 3.4-10.4l7.7 6z"/><path fill="34A853" d="M24 47c5.9 0 10.9-1.9 14.5-5.2l-7.7-6c-2 1.3-4.5 2.1-7.3 2.1-6 0-11.2-3.9-13-9.2l-7.7 6C7.1 40.4 14.9 47 24 47z"/><path fill="none" d="M0 0h48v48H0z"/>`;
   
  // Google logo
  const googleLogo = document.createElement('img');
  googleLogo.src = '/images/google.jpg'; // Assuming google.jpg is in public/images
  googleLogo.style.height = '30px'; // Set a fixed, smaller height for the logo
  googleLogo.style.width = '30px';  // Set a fixed, smaller width for the logo
  googleLogo.style.verticalAlign = 'center';
 
   googleLoginButton.appendChild(googleLogo);
   
   googleLoginButton.addEventListener('click', () => {
    const googleAuthUrl = getGoogleAuth(); // Generate the Google OAuth URL
    window.location.href = googleAuthUrl; // Redirect the user to the Google OAuth URL
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

  // Add click listeners to internal links to use navigateTo
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
const routes: { [key: string]: () => (() => void) | void } = { // render functions can return a cleanup function
  '/': renderWelcome,
  '/login': renderLogin,
  '/signUp': renderSignUp,
  '/username-google' : renderGoogle,
  '/game': renderGame,
  '/dashboard': renderDashboard,
  '/delete': renderDelete, // Add the delete route
  // '/test': createTestPage
  // '/username-google': renderHomePage

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