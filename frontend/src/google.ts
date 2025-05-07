import './google.css'; // Import the CSS file

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
  usernameInput.className = "google-username-input-field";
  usernameInput.placeholder = "Enter your desired username";
  usernameInput.required = true;
  usernameInput.autocomplete = "username";


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

    // Implement the logic to send the username to your backend
    // This might involve fetching the Google email/ID stored temporarily (e.g., in sessionStorage)
    // and then making a POST request to a new backend endpoint.
    console.log("Username submitted:", username);
    try {
      // Example:
      // const googleProfile = JSON.parse(sessionStorage.getItem('googleProfile') || '{}');
      // const response = await fetch('https://127.0.0.1:3000/complete-google-signup', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, email: googleProfile.email, googleId: googleProfile.id }),
      // });
      // const data = await response.json();
      // if (response.ok && data.success) {
      //   alert('Username set successfully! Redirecting to dashboard...');
      //   window.location.hash = '#/dashboard';
      // } else {
      //   throw new Error(data.error || 'Failed to set username.');
      // }
      alert(`Username "${username}" would be processed here. Implement backend call.`);
      // For now, redirect to dashboard as a placeholder
      window.location.hash = '#/dashboard';

    } catch (error: any) {
      console.error('Error setting username:', error);
      errorMessageDiv.textContent = error.message || "An error occurred.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Set Username & Continue';
    }
  });
}