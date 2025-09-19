import { navigateTo } from './main';
import './general.css'

export function renderTwoFA() {
	const urlParams = new URLSearchParams(window.location.search);
	const tempTokenFromUrl = urlParams.get('tempToken');
	if (tempTokenFromUrl) {
	  sessionStorage.setItem('tempToken', tempTokenFromUrl);
	}
  
	const app = document.querySelector<HTMLDivElement>('#app');
	if (!app) {
	  throw new Error('App root element (#app) not found!');
	}
  app.innerHTML = `
  <div class="container">
    <div class="card">
      <h2 class="title">Two-Factor Authentication</h2>
      <div>
        <label for="code" class="label">2FA Code</label>
        <input 
          id="code" 
          type="text" 
          placeholder="Enter your 6-digit code" 
          autocomplete="one-time-code" 
          required 
          class="input"
          maxlength="6"
        />
      </div>
      <button 
        id="submit" 
        class="button"
      >
        Verify
      </button>
      <div id="error" class="error"></div>
    </div>
  </div>
`;
  
	const submitButton = document.getElementById('submit') as HTMLButtonElement;
	const errorDiv = document.getElementById('error') as HTMLDivElement;
  
	submitButton.addEventListener('click', async () => {
	  const codeInput = document.getElementById('code') as HTMLInputElement;
	  const code = codeInput.value.trim();
	  const tempToken = sessionStorage.getItem('tempToken');
  
	  if (!code) {
		errorDiv.textContent = "Please enter your 2FA code.";
		return;
	  }
	  if (!tempToken) {
		errorDiv.textContent = "No temporary login session found. Please login again.";
		return;
	  }
  
	  submitButton.disabled = true;
	  errorDiv.textContent = "";
  
	  try {
		const res = await fetch(`${import.meta.env.VITE_URL}/login/2fa`, {
		  method: 'POST',
		  headers: { 'Content-Type': 'application/json' },
		  body: JSON.stringify({ token: code, tempToken }),
		});
  
		const data = await res.json();
  
		if (res.ok) {
		  sessionStorage.removeItem('tempToken');
		  sessionStorage.setItem('authToken', data.token);
		  navigateTo('/dashboard');
		} else {
		  errorDiv.textContent = data.error || "Invalid 2FA code. Please try again.";
		}
	  } catch (err) {
		console.error(err);
		errorDiv.textContent = "An error occurred during 2FA verification.";
	  } finally {
		submitButton.disabled = false;
	  }
	});
  }
  