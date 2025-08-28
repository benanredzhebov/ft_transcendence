import getGoogleAuth from './GetGoogleAuth';
import './style.css';
import { navigateTo } from './main';

export function renderWelcome(): (() => void) | void {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';

  const container = document.createElement('div');
  container.className = "welcome-container";

  const card = document.createElement('div');
  card.className = "welcome-card";

  const title = document.createElement('h1');
  title.className = "welcome-title";
  title.innerHTML = `<br> <span>PONG</span>`;

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

  // Google logo
  const googleLogo = document.createElement('img');
  googleLogo.src = '/google.jpg';
  googleLogo.style.height = '30px';
  googleLogo.style.width = '30px'; 
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
