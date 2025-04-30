import './login.css'; // Import the CSS file

export function renderLogin() {
  const appElement = document.querySelector<HTMLDivElement>('#app');
  if (!appElement) {
    throw new Error('App root element (#app) not found!');
  }

  // Clear previous content
  appElement.innerHTML = '';

  // --- Create Elements ---

  // Global Container
  const globalContainer = document.createElement('div');
  // Use the CSS class, background is handled by CSS now
  globalContainer.className = "login-global-container";

  // Card Container
  const cardContainer = document.createElement('div');
  cardContainer.className = "login-card-container";

  // Left Side
  const leftSide = document.createElement('div');
  leftSide.className = "login-left-side";

  // Top Content
  const heading = document.createElement('h2');
  heading.className = "login-heading";
  heading.textContent = "Log In";

  const paragraph = document.createElement('p');
  paragraph.className = "login-paragraph";
  paragraph.textContent = "Log in to your account to access the game and features.";

  // Login Form
  const form = document.createElement('form');
  form.id = "login-form";
  form.className = "login-form"; // Add class for potential styling

  // Email Input
  const emailInput = document.createElement('input');
  emailInput.type = "email";
  emailInput.id = "email";
  emailInput.name = "email";
  emailInput.className = "login-input"; // Use CSS class
  emailInput.placeholder = "Enter your email address";
  emailInput.required = true;

  // Password Input
  const passwordInput = document.createElement('input');
  passwordInput.type = "password";
  passwordInput.id = "password";
  passwordInput.name = "password";
  passwordInput.className = "login-input"; // Use CSS class
  passwordInput.placeholder = "Enter your password";
  passwordInput.required = true;

  // Error Message Display
  const errorMessageDiv = document.createElement('div');
  errorMessageDiv.id = "error-message";
  errorMessageDiv.className = "login-error-message"; // Use CSS class

  // Middle Content Container
  const middleContentContainer = document.createElement('div');
  middleContentContainer.className = "login-middle-container"; // Use CSS class

  // Forgot Password Link
  const forgotPasswordLink = document.createElement('div');
  forgotPasswordLink.id = "forgot-password";
  forgotPasswordLink.className = "login-forgot-password"; // Use CSS class
  forgotPasswordLink.textContent = "Forgot password";

  // Login Button
  const loginButton = document.createElement('button');
  loginButton.type = "submit";
  loginButton.id = "login-button";
  loginButton.className = "login-button"; // Use CSS class

  const loginButtonSpan = document.createElement('span');
  loginButtonSpan.textContent = "Login";

  // SVG is complex, keeping inline for now, but could be moved to CSS background/mask
  // const loginButtonSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  // ... (SVG attributes remain the same) ...
  loginButton.appendChild(loginButtonSpan);
  // loginButton.appendChild(loginButtonSvg);

  // Border
  const borderDiv = document.createElement('div');
  borderDiv.className = "login-border"; // Use CSS class

  // Bottom Content "or log in with"
  const bottomParagraph = document.createElement('p');
  bottomParagraph.className = "login-bottom-paragraph"; // Use CSS class
  bottomParagraph.textContent = "or log in with";

  // Bottom Buttons Container
  const bottomButtonsContainer = document.createElement('div');
  bottomButtonsContainer.className = "login-bottom-buttons-container"; // Use CSS class

  // Intra Login Button
  const intraLoginButton = document.createElement('button');
  intraLoginButton.id = "intra-login-button";
  intraLoginButton.className = "login-oauth-button"; // Use common OAuth button class
  const intraSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  intraSvg.setAttribute("fill", "currentColor");
  intraSvg.setAttribute("viewBox", "0 0 16 16");
  intraSvg.innerHTML = `<path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.08 7.978l.31-1.18h.077l.313 1.18h.586l-.55-1.913h-.618l-.548 1.913zm2.17 0V6.063h.403v1.915zm1.302 0V6.063h.403v1.915zm1.285-.907c0-.433.27-.715.646-.715.375 0 .646.282.646.715 0 .43-.27.714-.646.714-.376 0-.646-.284-.646-.714m.403 0c0 .218.12.347.243.347.124 0 .243-.13.243-.347 0-.22-.12-.347-.243-.347-.124 0-.243-.128-.243-.347m1.415.907V6.063h.403v1.915zm1.33-.48h.078l.312 1.18h.585l-.55-1.913h-.618l-.548 1.913h.586l.31-1.18z"/>`;
  const intraSpan = document.createElement('span');
  intraSpan.textContent = "Intra";
  intraLoginButton.appendChild(intraSvg);
  intraLoginButton.appendChild(intraSpan);

  // Google Login Button
  const googleLoginButton = document.createElement('button');
  googleLoginButton.id = "google-login-button";
  googleLoginButton.className = "login-oauth-button"; // Use common OAuth button class
  const googleSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  googleSvg.setAttribute("viewBox", "0 0 48 48");
  googleSvg.innerHTML = `<path fill="#EA4335" d="M24 9.5c3.4 0 6.3 1.2 8.6 3.2l6.4-6.4C34.9 2.8 29.9 1 24 1 14.9 1 7.1 6.6 3.4 14.4l7.7 6C12.8 13.4 18 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.8-.2-3.5-.5-5.2H24v9.9h12.7c-.6 3.2-2.3 5.9-4.9 7.8l7.7 6c4.5-4.1 7-10.1 7-17.5z"/><path fill="#FBBC05" d="M11.1 20.4c-.5 1.5-.8 3.1-.8 4.8s.3 3.3.8 4.8l-7.7 6C1.2 31.6 0 28 0 24s1.2-7.6 3.4-10.4l7.7 6z"/><path fill="#34A853" d="M24 47c5.9 0 10.9-1.9 14.5-5.2l-7.7-6c-2 1.3-4.5 2.1-7.3 2.1-6 0-11.2-3.9-13-9.2l-7.7 6C7.1 40.4 14.9 47 24 47z"/><path fill="none" d="M0 0h48v48H0z"/>`;
  const googleSpan = document.createElement('span');
  googleSpan.textContent = "Google";
  googleLoginButton.appendChild(googleSvg);
  googleLoginButton.appendChild(googleSpan);

  // Sign Up Link Paragraph
  const signUpParagraph = document.createElement('p');
  signUpParagraph.className = "login-signup-paragraph"; // Use CSS class
  const signUpLink = document.createElement('a');
  signUpLink.href = "#/signUp";
  signUpLink.className = "login-signup-link"; // Use CSS class
  signUpLink.textContent = "Sign Up";
  signUpParagraph.textContent = "Don't have an account? ";
  signUpParagraph.appendChild(signUpLink);

  // Close Button Container
  const closeButtonContainer = document.createElement('div');
  closeButtonContainer.id = "close-login-button";
  closeButtonContainer.className = "login-close-button"; // Use CSS class
  const closeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  // Add path child for the 'X' icon defined in CSS
  const closePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  closeSvg.appendChild(closePath);
  closeButtonContainer.appendChild(closeSvg);


  // --- Append Elements ---
  middleContentContainer.appendChild(forgotPasswordLink);
  middleContentContainer.appendChild(loginButton);

  form.appendChild(emailInput);
  form.appendChild(passwordInput);
  form.appendChild(errorMessageDiv);
  form.appendChild(middleContentContainer);

  bottomButtonsContainer.appendChild(intraLoginButton);
  bottomButtonsContainer.appendChild(googleLoginButton);

  leftSide.appendChild(heading);
  leftSide.appendChild(paragraph);
  leftSide.appendChild(form);
  leftSide.appendChild(borderDiv);
  leftSide.appendChild(bottomParagraph);
  leftSide.appendChild(bottomButtonsContainer);
  leftSide.appendChild(signUpParagraph);

  cardContainer.appendChild(leftSide);
  // cardContainer.appendChild(rightSide); // Uncomment if you add the right side image div
  cardContainer.appendChild(closeButtonContainer);

  globalContainer.appendChild(cardContainer);

  appElement.appendChild(globalContainer);

  // Add event listeners now that the DOM is built
  addLoginFormListeners();
}

// --- Event Listener Setup for Login Form ---
// (addLoginFormListeners function remains the same as before)
function addLoginFormListeners() {
  const form = document.getElementById('login-form') as HTMLFormElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const errorDiv = document.getElementById('error-message');
  const loginButton = document.getElementById('login-button') as HTMLButtonElement;
  const closeButton = document.getElementById('close-login-button');
  const googleLoginButton = document.getElementById('google-login-button');
  const intraLoginButton = document.getElementById('intra-login-button');
  const forgotPasswordLink = document.getElementById('forgot-password');

  if (!form || !errorDiv || !loginButton || !closeButton || !googleLoginButton || !intraLoginButton || !forgotPasswordLink) {
      console.error("One or more login elements not found. Cannot attach listeners.");
      return;
  }

  form.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginButton.disabled = true;
      const loginButtonSpan = loginButton.querySelector('span');
      if (loginButtonSpan) loginButtonSpan.textContent = 'Logging in...'; // Update button text
      if (errorDiv) errorDiv.textContent = ''; // Clear previous errors

      const email = emailInput.value;
      const password = passwordInput.value;
      const loginData = { email, password };

      try {
          // Use the correct backend URL (ensure HTTPS and port are right)
          const response = await fetch('https://localhost:3000/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(loginData),
          });

          const data = await response.json();

          if (response.ok && data.success !== false) { // Check for explicit failure if backend sends success: false
              console.log('Login successful:', data);
              // Store token if received (example)
              // if (data.token) { localStorage.setItem('authToken', data.token); }
              window.location.hash = '#/dashboard'; // Navigate to dashboard/game on success
          } else {
              throw new Error(data.error || 'Login failed. Please try again.');
          }
      } catch (error: any) {
          console.error('Error during login:', error);
          if (errorDiv) errorDiv.textContent = error.message || 'An error occurred during login.';
      } finally {
          // Always re-enable the button and reset text, regardless of success/failure
          loginButton.disabled = false;
          const loginButtonSpan = loginButton.querySelector('span');
          if (loginButtonSpan) loginButtonSpan.textContent = 'Login'; // Reset button text
      }
  });

  // Close button navigates back to Welcome page
  closeButton.addEventListener('click', () => {
      window.location.hash = '#/';
  });

  // --- OAuth Button Handlers (Placeholder Actions) ---
  googleLoginButton.addEventListener('click', () => {
      console.log('Google login clicked - initiating OAuth flow...');
      alert('Google Login not implemented yet.');
  });

  intraLoginButton.addEventListener('click', () => {
      console.log('Intra login clicked - initiating OAuth flow...');
      alert('Intra Login not implemented yet.');
  });

  // Forgot password link
  forgotPasswordLink.addEventListener('click', () => {
      alert('Forgot Password functionality not implemented yet.');
  });
}