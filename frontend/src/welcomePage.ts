import { navigateTo } from './main';
import getGoogleAuth from './GetGoogleAuth';
import './style.css';

export function renderWelcome(app: HTMLDivElement): (() => void) | void {
  app.innerHTML = '';

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