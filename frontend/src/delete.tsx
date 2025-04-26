import React, { useState } from 'react';

const DeleteUser: React.FC = () => {
    const [id, setId] = useState<number | ''>('');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (window.confirm('Are you sure you want to delete this user?')) {
            fetch('/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id }),
            })
                .then((response) => {
                    if (response.ok) {
                        alert('User deleted successfully');
                        setId('');
                    } else {
                        alert('Failed to delete user');
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert('An error occurred');
                });
        }
    };

    return (
        <div>
            <h1>Delete User</h1>
            <form onSubmit={handleSubmit}>
                <label htmlFor="id">User ID:</label>
                <input
                    type="number"
                    id="id"
                    name="id"
                    value={id}
                    onChange={(e) => setId(Number(e.target.value) || '')}
                    required
                />
                <button type="submit">Delete</button>
            </form>
        </div>
    );
};

export default DeleteUser;