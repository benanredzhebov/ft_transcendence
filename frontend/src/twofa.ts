import { navigateTo } from './main';

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
    <div class="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div class="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm space-y-6">
        <h2 class="text-2xl font-bold text-center">Two-Factor Authentication</h2>
        
        <div>
          <label for="twofa-code" class="sr-only">2FA Code</label>
          <input 
            id="twofa-code" 
            type="text" 
            placeholder="Enter your 6-digit code" 
            autocomplete="one-time-code" 
            required 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest text-lg" 
            maxlength="6"
          />
        </div>

        <button 
          id="twofa-submit" 
          class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Verify
        </button>

        <div id="twofa-error" class="text-red-400 text-center h-5"></div>
      </div>
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
  