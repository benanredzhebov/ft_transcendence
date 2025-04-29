import './signup.css'; // Import the CSS file

export function renderSignUp() {
  const appElement = document.querySelector<HTMLDivElement>('#app');
  if (!appElement) {
    throw new Error('App root element (#app) not found!');
  }

  // Clear previous content
  appElement.innerHTML = '';

  // --- Create Elements ---

  // Global Container
  const globalContainer = document.createElement('div');
  globalContainer.className = "signup-global-container";

  // Card Container
  const cardContainer = document.createElement('div');
  cardContainer.className = "signup-card-container";

  // Left Side (Form Side)
  const leftSide = document.createElement('div');
  leftSide.className = "signup-left-side";

  // Top Content
  const heading = document.createElement('h2');
  heading.className = "signup-heading";
  heading.textContent = "Sign Up";

  const paragraph = document.createElement('p');
  paragraph.className = "signup-paragraph";
  paragraph.textContent = "Create your account to join the game.";

  // Signup Form
  const form = document.createElement('form');
  form.id = "signup-form";
  form.className = "signup-form";

  // Username Input
  const usernameInput = document.createElement('input');
  usernameInput.type = "text";
  usernameInput.id = "username";
  usernameInput.name = "username";
  usernameInput.className = "signup-input";
  usernameInput.placeholder = "Choose a username";
  usernameInput.required = true;

  // Email Input
  const emailInput = document.createElement('input');
  emailInput.type = "email";
  emailInput.id = "email";
  emailInput.name = "email";
  emailInput.className = "signup-input";
  emailInput.placeholder = "Enter your email address";
  emailInput.required = true;

  // Password Input
  const passwordInput = document.createElement('input');
  passwordInput.type = "password";
  passwordInput.id = "password";
  passwordInput.name = "password";
  passwordInput.className = "signup-input";
  passwordInput.placeholder = "Create a password";
  passwordInput.required = true;

  // Error Message Display
  const errorMessageDiv = document.createElement('div');
  errorMessageDiv.id = "error-message";
  errorMessageDiv.className = "signup-error-message";

  // Middle Content Container (for the button)
  const middleContentContainer = document.createElement('div');
  middleContentContainer.className = "signup-middle-container";

  // Signup Button
  const signupButton = document.createElement('button');
  signupButton.type = "submit";
  signupButton.id = "signup-button";
  signupButton.className = "signup-button";

  const signupButtonSpan = document.createElement('span');
  signupButtonSpan.textContent = "Sign Up";
  signupButton.appendChild(signupButtonSpan);

  // Border
  const borderDiv = document.createElement('div');
  borderDiv.className = "signup-border";

  // Bottom Content "or sign up with"
  const bottomParagraph = document.createElement('p');
  bottomParagraph.className = "signup-bottom-paragraph";
  bottomParagraph.textContent = "or sign up with";

  // Bottom Buttons Container (OAuth)
  const bottomButtonsContainer = document.createElement('div');
  bottomButtonsContainer.className = "signup-bottom-buttons-container";

  // Intra Signup Button
  const intraSignupButton = document.createElement('button');
  intraSignupButton.id = "intra-signup-button";
  intraSignupButton.className = "signup-oauth-button";
  const intraSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  intraSvg.setAttribute("fill", "currentColor");
  intraSvg.setAttribute("viewBox", "0 0 16 16");
  intraSvg.innerHTML = `<path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.08 7.978l.31-1.18h.077l.313 1.18h.586l-.55-1.913h-.618l-.548 1.913zm2.17 0V6.063h.403v1.915zm1.302 0V6.063h.403v1.915zm1.285-.907c0-.433.27-.715.646-.715.375 0 .646.282.646.715 0 .43-.27.714-.646.714-.376 0-.646-.284-.646-.714m.403 0c0 .218.12.347.243.347.124 0 .243-.13.243-.347 0-.22-.12-.347-.243-.347-.124 0-.243-.128-.243-.347m1.415.907V6.063h.403v1.915zm1.33-.48h.078l.312 1.18h.585l-.55-1.913h-.618l-.548 1.913h.586l.31-1.18z"/>`;
  const intraSpan = document.createElement('span');
  intraSpan.textContent = "Intra";
  intraSignupButton.appendChild(intraSvg);
  intraSignupButton.appendChild(intraSpan);

  // Google Signup Button
  const googleSignupButton = document.createElement('button');
  googleSignupButton.id = "google-signup-button";
  googleSignupButton.className = "signup-oauth-button";
  const googleSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  googleSvg.setAttribute("viewBox", "0 0 48 48");
  googleSvg.innerHTML = `<path fill="#EA4335" d="M24 9.5c3.4 0 6.3 1.2 8.6 3.2l6.4-6.4C34.9 2.8 29.9 1 24 1 14.9 1 7.1 6.6 3.4 14.4l7.7 6C12.8 13.4 18 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.8-.2-3.5-.5-5.2H24v9.9h12.7c-.6 3.2-2.3 5.9-4.9 7.8l7.7 6c4.5-4.1 7-10.1 7-17.5z"/><path fill="#FBBC05" d="M11.1 20.4c-.5 1.5-.8 3.1-.8 4.8s.3 3.3.8 4.8l-7.7 6C1.2 31.6 0 28 0 24s1.2-7.6 3.4-10.4l7.7 6z"/><path fill="#34A853" d="M24 47c5.9 0 10.9-1.9 14.5-5.2l-7.7-6c-2 1.3-4.5 2.1-7.3 2.1-6 0-11.2-3.9-13-9.2l-7.7 6C7.1 40.4 14.9 47 24 47z"/><path fill="none" d="M0 0h48v48H0z"/>`;
  const googleSpan = document.createElement('span');
  googleSpan.textContent = "Google";
  googleSignupButton.appendChild(googleSvg);
  googleSignupButton.appendChild(googleSpan);

  // Login Link Paragraph
  const loginParagraph = document.createElement('p');
  loginParagraph.className = "signup-login-paragraph";
  const loginLink = document.createElement('a');
  loginLink.href = "#/login";
  loginLink.className = "signup-login-link";
  loginLink.textContent = "Log In";
  loginParagraph.textContent = "Already have an account? ";
  loginParagraph.appendChild(loginLink);

  // Close Button Container
  const closeButtonContainer = document.createElement('div');
  closeButtonContainer.id = "close-signup-button";
  closeButtonContainer.className = "signup-close-button";
  const closeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const closePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  closeSvg.appendChild(closePath);
  closeButtonContainer.appendChild(closeSvg);

  // --- Append Elements ---
  middleContentContainer.appendChild(signupButton);

  form.appendChild(usernameInput);
  form.appendChild(emailInput);
  form.appendChild(passwordInput);
  form.appendChild(errorMessageDiv);
  form.appendChild(middleContentContainer);

  bottomButtonsContainer.appendChild(intraSignupButton);
  bottomButtonsContainer.appendChild(googleSignupButton);

  leftSide.appendChild(heading);
  leftSide.appendChild(paragraph);
  leftSide.appendChild(form);
  leftSide.appendChild(borderDiv);
  leftSide.appendChild(bottomParagraph);
  leftSide.appendChild(bottomButtonsContainer);
  leftSide.appendChild(loginParagraph);

  cardContainer.appendChild(leftSide);
  cardContainer.appendChild(closeButtonContainer);

  globalContainer.appendChild(cardContainer);

  appElement.appendChild(globalContainer);

  // Add event listeners
  addSignupFormListeners();
}

// --- Event Listener Setup for Signup Form ---
function addSignupFormListeners() {
  const form = document.getElementById('signup-form') as HTMLFormElement;
  const usernameInput = document.getElementById('username') as HTMLInputElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const errorDiv = document.getElementById('error-message');
  const signupButton = document.getElementById('signup-button') as HTMLButtonElement;
  const closeButton = document.getElementById('close-signup-button');
  const googleSignupButton = document.getElementById('google-signup-button');
  const intraSignupButton = document.getElementById('intra-signup-button');

  if (!form || !errorDiv || !signupButton || !closeButton || !googleSignupButton || !intraSignupButton) {
      console.error("One or more signup elements not found. Cannot attach listeners.");
      return;
  }

  form.addEventListener('submit', async (e) => {
      e.preventDefault();

      signupButton.disabled = true;
      const signupButtonSpan = signupButton.querySelector('span');
      if (signupButtonSpan) signupButtonSpan.textContent = 'Signing up...';
      if (errorDiv) errorDiv.textContent = ''; // Clear previous errors

      const username = usernameInput.value;
      const email = emailInput.value;
      const password = passwordInput.value;
      const signupData = { username, email, password };

      try {
          const response = await fetch('https://localhost:3000/signUp', { // Use correct backend URL
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(signupData),
          });

          const data = await response.json();

          if (response.ok && data.success !== false) {
              console.log('Signup successful:', data);
              alert('Signup successful! Please log in.'); // Inform user
              window.location.hash = '#/login'; // Redirect to login page
          } else {
              throw new Error(data.error || 'Signup failed. Please try again.');
          }
      } catch (error: any) {
          console.error('Error during signup:', error);
          if (errorDiv) errorDiv.textContent = error.message || 'An error occurred during signup.';
      } finally {
          signupButton.disabled = false;
          if (signupButtonSpan) signupButtonSpan.textContent = 'Sign Up';
      }
  });

  // Close button navigates back to Welcome page
  closeButton.addEventListener('click', () => {
      window.location.hash = '#/';
  });

  // --- OAuth Button Handlers (Placeholder Actions) ---
  googleSignupButton.addEventListener('click', () => {
      console.log('Google signup clicked - initiating OAuth flow...');
      alert('Google Signup not implemented yet.');
  });

  intraSignupButton.addEventListener('click', () => {
      console.log('Intra signup clicked - initiating OAuth flow...');
      alert('Intra Signup not implemented yet.');
  });
}