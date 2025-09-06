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

  // against XSS attacks
  // Title
  const title = document.createElement('h3');
  title.textContent = 'Edit Profile';
  modalContent.appendChild(title);

  // Form
  const form = document.createElement('form');
  form.id = 'profile-edit-form';
  form.className = 'profile-edit-form';
  modalContent.appendChild(form);

  // Username group
  const usernameGroup = document.createElement('div');
  usernameGroup.className = 'form-group';
  const usernameLabel = document.createElement('label');
  usernameLabel.htmlFor = 'username';
  usernameLabel.textContent = 'Username';
  const usernameInput = document.createElement('input');
  usernameInput.type = 'text';
  usernameInput.id = 'username';
  usernameInput.name = 'username';
  usernameInput.value = currentUser.username; // Safely setting the value
  usernameInput.required = true;
  usernameGroup.append(usernameLabel, usernameInput);
  form.appendChild(usernameGroup);

  // Email group
  const emailGroup = document.createElement('div');
  emailGroup.className = 'form-group';
  const emailLabel = document.createElement('label');
  emailLabel.htmlFor = 'email';
  emailLabel.textContent = 'Email';
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'email';
  emailInput.name = 'email';
  emailInput.value = currentUser.email; // Safely setting the value
  emailInput.required = true;
  emailInput.disabled = true;
  const emailNotice = document.createElement('p');
  emailNotice.className = 'google-auth-notice';
  emailNotice.textContent = 'Email cannot be changed.';
  emailGroup.append(emailLabel, emailInput, emailNotice);
  form.appendChild(emailGroup);

  // Separator
  const hr = document.createElement('hr');
  hr.style.borderColor = '#4f545c';
  hr.style.margin = '1.5rem 0';
  form.appendChild(hr);

  // New Password group
  const passwordGroup = document.createElement('div');
  passwordGroup.className = 'form-group';
  const passwordLabel = document.createElement('label');
  passwordLabel.htmlFor = 'newPassword';
  passwordLabel.textContent = 'New Password (optional)';
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.id = 'newPassword';
  passwordInput.name = 'newPassword';
  passwordInput.placeholder = isGmailUser ? 'Not applicable' : 'Leave blank to keep current';
  if (isGmailUser) {
    passwordInput.disabled = true;
  }
  passwordGroup.append(passwordLabel, passwordInput);
  form.appendChild(passwordGroup);

  // Status paragraph
  const statusEl = document.createElement('p');
  statusEl.id = 'profile-edit-status';
  form.appendChild(statusEl);

  // Action buttons
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'profile-edit-modal-actions';
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.id = 'cancel-edit-button';
  cancelButton.className = 'profile-edit-modal-button cancel';
  cancelButton.textContent = 'Cancel';
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.id = 'save-edit-button';
  saveButton.className = 'profile-edit-modal-button save';
  saveButton.textContent = 'Save Changes';
  actionsDiv.append(cancelButton, saveButton);
  form.appendChild(actionsDiv);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // --- Event Listeners ---
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