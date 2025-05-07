const app = document.createElement('div');
app.innerHTML = `
  <header style="background-color: #4CAF50; color: white; padding: 10px 0; text-align: center;">
    <h1>Database Cleaner</h1>
  </header>
  <main style="padding: 20px; font-family: Arial, sans-serif;">
    <h2>Clean Database</h2>
    <p>Enter the user ID to delete from the database:</p>
    <div style="margin-bottom: 10px;">
      <input id="userIdInput" type="number" placeholder="Enter User ID" style="padding: 10px; font-size: 16px; width: 100%; max-width: 300px;" />
    </div>
    <button id="deleteButton" style="padding: 10px 20px; font-size: 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Delete User
    </button>
    <p id="responseMessage" style="margin-top: 20px; color: red;"></p>
  </main>
`;

document.body.appendChild(app);

const deleteButton = document.getElementById('deleteButton') as HTMLButtonElement;
const userIdInput = document.getElementById('userIdInput') as HTMLInputElement;
const responseMessage = document.getElementById('responseMessage') as HTMLParagraphElement;

deleteButton.addEventListener('click', async () => {
    const userId = userIdInput.value;

    if (!userId) {
        responseMessage.textContent = 'Please enter a valid user ID.';
        return;
    }

    try {
        const response = await fetch('https://127.0.0.1:3000/delete', { // Corrected URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: Number(userId) }),
        });

        const result = await response.json();
        if (response.ok) {
            responseMessage.style.color = 'green';
            responseMessage.textContent = result.message || 'User deleted successfully.';
        } else {
            responseMessage.style.color = 'red';
            responseMessage.textContent = result.error || 'Failed to delete user.';
        }
    } catch (error) {
        responseMessage.style.color = 'red';
        responseMessage.textContent = 'An error occurred while deleting the user.';
        console.error(error);
    }
});