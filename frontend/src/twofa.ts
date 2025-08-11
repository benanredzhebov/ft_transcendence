import { navigateTo } from './main';  // Adjust the path if needed

export function renderTwoFA() {
	const app = document.querySelector<HTMLDivElement>('#app');
	if (!app) {
	  throw new Error('App root element (#app) not found!');
	}
  
	app.innerHTML = `
	  <div class="twofa-container">
		<h2>Two-Factor Authentication</h2>
		<input id="twofa-code" type="text" placeholder="Enter your 2FA code" autocomplete="one-time-code" />
		<button id="twofa-submit">Verify</button>
		<div id="twofa-error" class="twofa-error"></div>
	  </div>
	`;
  
	const submitButton = document.getElementById('twofa-submit') as HTMLButtonElement;
	const errorDiv = document.getElementById('twofa-error') as HTMLDivElement;
  
	submitButton.addEventListener('click', async () => {
	  const codeInput = document.getElementById('twofa-code') as HTMLInputElement;
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
  
  