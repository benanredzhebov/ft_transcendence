import './google.css'; 
import { navigateTo } from './main';

export function renderGoogle() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    console.error('App root element (#app) not found for renderGoogle!');
    return;
  }
  app.innerHTML = ''; // Clear existing content

  const container = document.createElement('div');
  container.className = "google-username-container";

  const card = document.createElement('div');
  card.className = "google-username-card";

  const title = document.createElement('h2');
  title.className = "google-username-title";
  title.textContent = "Choose Your Username";

  const instruction = document.createElement('p');
  instruction.className = "google-username-instruction";
  instruction.textContent = "Your Google authentication was successful. Please set a username to complete your registration.";

  const form = document.createElement('form');
  form.id = "google-username-form";
  form.className = "google-username-form";

  const usernameInput = document.createElement('input');
  usernameInput.type = "text";
  usernameInput.id = "google-username-input";
  usernameInput.name = "username";
  usernameInput.placeholder = "Enter your desired username";
  usernameInput.required = true;

  const errorMessageDiv = document.createElement('div');
  errorMessageDiv.id = "google-username-error";
  errorMessageDiv.className = "google-username-error-message";

  const submitButton = document.createElement('button');
  submitButton.type = "submit";
  submitButton.className = "google-username-submit-button";
  submitButton.textContent = "Set Username & Continue";

  form.appendChild(usernameInput);
  form.appendChild(errorMessageDiv);
  form.appendChild(submitButton);

  card.appendChild(title);
  card.appendChild(instruction);
  card.appendChild(form);
  container.appendChild(card);
  app.appendChild(container);

  // Add event listener for the form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    errorMessageDiv.textContent = ''; // Clear previous errors
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    if (!username) {
      errorMessageDiv.textContent = "Username cannot be empty.";
      submitButton.disabled = false;
      submitButton.textContent = 'Set Username & Continue';
      return;
    }

    try {
      const response = await fetch('/api/google/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.requires2FA) {
          sessionStorage.setItem('tempToken', data.tempToken);
          navigateTo('/2fa'); // Redirect to 2FA page
        } else {
          sessionStorage.setItem('authToken', data.token);
          navigateTo('/dashboard'); // Redirect to dashboard
        }
      } else {
        throw new Error(data.error || 'Failed to set username.');
      }
    } catch (error: any) {
      console.error('Error setting username:', error);
      errorMessageDiv.textContent = error.message || "An error occurred.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Set Username & Continue';
    }
  });
}