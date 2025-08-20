
 
import './login.css'; // Import the CSS file
import { navigateTo } from './main';


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


  // Bottom Buttons Container
  const bottomButtonsContainer = document.createElement('div');
  bottomButtonsContainer.className = "login-bottom-buttons-container"; // Use CSS class


  // Sign Up Link Paragraph
  const signUpParagraph = document.createElement('p');
  signUpParagraph.className = "login-signup-paragraph"; // Use CSS class
  const signUpLink = document.createElement('a');
  signUpParagraph.textContent = "Don't have an account? ";
  signUpLink.href = "/signUp"; // Changed from /signUp
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

  leftSide.appendChild(heading);
  leftSide.appendChild(paragraph);
  leftSide.appendChild(form);
  leftSide.appendChild(borderDiv);
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
  const forgotPasswordLink = document.getElementById('forgot-password');

  if (!form || !errorDiv || !loginButton || !closeButton || !forgotPasswordLink) {
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
          const response = await fetch(`${import.meta.env.VITE_URL}/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(loginData),
          });

      const data = await response.json();
      if (response.ok && data.success !== false) {
			console.log('Login successful:', data);

			// Store token if received (example)
			if (data.token) {
			  sessionStorage.setItem('authToken', data.token);
        console.log('Token sent after Login!', data);
			} else {
			  console.warn('No token received from login endpoint.');
			}
			navigateTo('/dashboard');
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
	  navigateTo('/');
  });


  // Forgot password link
  forgotPasswordLink.addEventListener('click', () => {
      alert('Forgot Password functionality not implemented yet.');
  });
}