import React, { useState } from 'react';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

	const handleSubmit = (e: React.FormEvent) => {
	e.preventDefault();
	// Prepare the data to send to the backend
	const loginData = { username, password };
	console.log('Sending login data:', loginData);

	// Example: Send the data to the backend (replace with your API endpoint)
	fetch('/api/login', {
	  method: 'POST',
	  headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify(loginData),
	})
	  .then((response) => response.json())
	  .then((data) => {
		console.log('Login successful:', data);
	  })
	  .catch((error) => {
		console.error('Error during login:', error);
	  });
  };

  return (
	<div>
	  <h2>Login</h2>
	  <form onSubmit={handleSubmit}>
		<div>
		  <label>
			Username
			<input
			  type="text"
			  value={username}
			  onChange={(e) => setUsername(e.target.value)}
			  required
			/>
		  </label>
		</div>
		<div>
		  <label>
			Password
			<input
			  type="password"
			  value={password}
			  onChange={(e) => setPassword(e.target.value)}
			  required
			/>
		  </label>
		</div>
		<button type="submit">Login</button>
	  </form>
	</div>
  );
}

export default Login;