import './profileEdit.css';
import { navigateTo } from './main';

// Function to close the modal
function closeModal() {
  const modal = document.querySelector('.profile-edit-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// Main function to open and handle the modal
export function profileEdit(token: string, currentUser: { username: string, email: string }) {
  // Close any existing modal first
  closeModal();

  const isGmailUser = currentUser.email.endsWith('@gmail.com');

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'profile-edit-modal-overlay';
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  const modalContent = document.createElement('div');
  modalContent.className = 'profile-edit-modal-content';
  modalContent.innerHTML = `
    <h3>Edit Profile</h3>
    <form id="profile-edit-form" class="profile-edit-form">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" value="${currentUser.username}" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" value="${currentUser.email}" required ${isGmailUser ? 'disabled' : ''}>
        ${isGmailUser ? '<p class="google-auth-notice">Email & password cannot be changed for Gmail accounts.</p>' : ''}
      </div>
      <hr style="border-color: #4f545c; margin: 1.5rem 0;">
      <div class="form-group">
        <label for="newPassword">New Password (optional)</label>
        <input type="password" id="newPassword" name="newPassword" placeholder="${isGmailUser ? 'Not applicable' : 'Leave blank to keep current'}" ${isGmailUser ? 'disabled' : ''}>
      </div>
      <p id="profile-edit-status"></p>
      <div class="profile-edit-modal-actions">
        <button type="button" id="cancel-edit-button" class="profile-edit-modal-button cancel">Cancel</button>
        <button type="submit" id="save-edit-button" class="profile-edit-modal-button save">Save Changes</button>
      </div>
    </form>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // --- Event Listeners ---
  const form = document.getElementById('profile-edit-form') as HTMLFormElement;
  const statusEl = document.getElementById('profile-edit-status') as HTMLParagraphElement;
  const currentPasswordInput = document.getElementById('currentPassword') as HTMLInputElement;

  if (isGmailUser && currentPasswordInput) {
    currentPasswordInput.required = false; // Remove requirement for disabled field
  }

  document.getElementById('cancel-edit-button')?.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = 'Saving...';

    const formData = new FormData(form);
    let updateData: { [key: string]: any };

    if (isGmailUser) {
      // For Gmail users, only allow username change.
      updateData = {
        username: formData.get('username'),
      };
    } else {
      // For other users, include all fields except currentPassword.
      updateData = {
        username: formData.get('username'),
        email: formData.get('email'),
      };
      const newPassword = formData.get('newPassword');
      if (newPassword) {
        updateData.newPassword = newPassword;
      }
    }

    try {
        const response = await fetch('/api/profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });

        const result = await response.json();

        if (response.ok) {
            statusEl.textContent = 'Profile updated successfully!';
            setTimeout(() => {
                closeModal();
                // Force a refresh of the dashboard view to show new data
                navigateTo('/dashboard'); 
            }, 1500);
        } else {
            throw new Error(result.error || 'Failed to update profile.');
        }
    } catch (error: any) {
        console.error('Error updating profile:', error);
        statusEl.textContent = `Error: ${error.message}`;
    }
  });
}