import React, { useState } from 'react';

function SignUp() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
    });

    const [responseMessage, setResponseMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/signUp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();
                setResponseMessage('Sign-up successful! User ID: ' + data.id);
            } else {
                const errorData = await response.json();
                setResponseMessage('Error: ' + errorData.error);
            }
        } catch (error) {
            setResponseMessage('An error occurred. Please try again.');
            console.error('Error:', error);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f4f4f4',
        }}>
            <form
                onSubmit={handleSubmit}
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
                }}>Signup</h2>
                <div>
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                        Username
                    </label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
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
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                        Email
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
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
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                        Password
                    </label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
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
                    Sign Up
                </button>
                {responseMessage && (
                    <p style={{marginTop: '15px', textAlign: 'center', color: 'red'}}>
                        {responseMessage}
                    </p>
                )}
            </form>
        </div>
    );
}

export default SignUp;