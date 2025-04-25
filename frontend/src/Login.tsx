// import React from 'react';

function Login() {
  return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f4f4f4',
      }}>
        <form
            action="/logIn"
            method="POST"
            style={{
              background: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              width: '300px',
            }}
        >
          <h2 style={{
            marginBottom: '20px',
            fontSize: '24px',
            textAlign: 'center',
          }}>Login</h2>
          <div>
            <label
                htmlFor="email"
                style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
            >
              Email
            </label>
            <input
                type="email"
                id="email"
                name="email"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
            />
          </div>
          <div>
            <label
                htmlFor="password"
                style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
            >
              Password
            </label>
            <input
                type="password"
                id="password"
                name="password"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
            />
          </div>
          <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
          >
            Submit
          </button>
        </form>
      </div>
  );
}

export default Login;