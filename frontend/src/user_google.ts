export function renderHomePage() {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) {
        throw new Error('App root element (#app) not found!');
    }

    app.innerHTML = `
    <header style="background-color: #4CAF50; color: white; padding: 10px 0; text-align: center;">
      <h1>Welcome to the Application</h1>
    </header>
    <main style="padding: 20px; font-family: Arial, sans-serif; text-align: center;">
      <h2>Home Page</h2>
      <p>Navigate through the application using the links below:</p>
      <div style="margin-top: 20px;">
        <a href="#/login" style="margin-right: 15px; text-decoration: none; color: #4CAF50; font-size: 18px;">Login</a>
        <a href="#/signUp" style="margin-right: 15px; text-decoration: none; color: #4CAF50; font-size: 18px;">Sign Up</a>
        <a href="#/delete" style="text-decoration: none; color: #4CAF50; font-size: 18px;">Delete User</a>
      </div>
    </main>
  `;
}