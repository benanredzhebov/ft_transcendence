// import React, { useState } from 'react';

function Login() {

  return (
    <div>
      <h2>Login</h2>
        <div>
          <label>
            Username
            <input
              type="text"
              required
            />
          </label>
        </div>
        <div>
          <label>
            Password
            <input
              type="password"
              required
            />
          </label>
        </div>
        <button type="submit">Login</button>
    </div>
  );
}

export default Login;