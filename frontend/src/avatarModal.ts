import './avatarModal.css';

const PREDEFINED_AVATARS = [
  '/avatars/girl.png',
  '/avatars/boy.png',
	'/avatars/gojo.png',
	'/avatars/luffy.png',
  '/avatars/squirtle.png',
  '/avatars/charizard.png',
  '/avatars/pikachu.png',
  '/avatars/bulbasaur.png',
  '/avatars/chain.png',
  '/avatars/chainsaw.png',
  '/avatars/halo.png',
  '/avatars/halo2.png',
  '/avatars/law.png',
  '/avatars/nami.png',
  '/avatars/nezuko.png',
  '/avatars/sanji.png',
  '/avatars/zoro.png'
];

export async function openAvatarSelectionModal(
  token: string,
  currentProfileAvatarImg: HTMLImageElement,
  avatarStatusElement: HTMLParagraphElement
) {
  // Modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'avatar-modal-overlay';
  
  // Modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'avatar-modal-content';

  const modalTitle = document.createElement('h4');
  modalTitle.textContent = 'Choose Your Avatar';
  modalTitle.style.textAlign = 'center';
  modalTitle.style.marginBottom = '20px';

  const avatarsGrid = document.createElement('div');
  avatarsGrid.className = 'avatar-modal-grid';

  PREDEFINED_AVATARS.forEach(avatarSrc => {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'avatar-modal-option';
    const imgEl = document.createElement('img');
    imgEl.src = avatarSrc;
    imgEl.alt = `Avatar ${avatarSrc.split('/').pop()}`;
    imgEl.style.width = '80px';
    imgEl.style.height = '80px';
    imgEl.style.borderRadius = '50%';
    imgEl.style.objectFit = 'cover';
    imgEl.style.cursor = 'pointer';

    imgWrapper.appendChild(imgEl);
    imgWrapper.addEventListener('click', async () => {
      avatarStatusElement.textContent = 'Processing...';
      modalContent.style.pointerEvents = 'none'; // Disable further clicks during processing
      try {
        const imageResponse = await fetch(avatarSrc);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch avatar: ${imageResponse.statusText}`);
        }
        const imageBlob = await imageResponse.blob();
        const fileName = avatarSrc.split('/').pop() || 'avatar.png';
        const imageFile = new File([imageBlob], fileName, { type: imageBlob.type });

        const formData = new FormData();
        formData.append('avatar', imageFile);

        const uploadResponse = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        const result = await uploadResponse.json();

        if (uploadResponse.ok && result.success) {
          avatarStatusElement.textContent = 'Avatar updated successfully!';
          if (result.avatarPath) { // Check for avatarPath
            currentProfileAvatarImg.src = result.avatarPath; // Use the path directly
          }
        } else {
          avatarStatusElement.textContent = result.error || 'Failed to update avatar.';
          console.error('Avatar update error:', result);
        }
      } catch (error) {
        console.error('Error selecting/uploading predefined avatar:', error);
        avatarStatusElement.textContent = 'Error updating avatar. See console.';
      } finally {
        closeModal();
      }
    });
    avatarsGrid.appendChild(imgWrapper);
  });

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.className = 'avatar-modal-close-button';
  closeButton.addEventListener('click', closeModal);

  modalContent.appendChild(modalTitle);
  modalContent.appendChild(avatarsGrid);
  modalContent.appendChild(closeButton);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  function closeModal() {
    if (document.body.contains(modalOverlay)) {
      document.body.removeChild(modalOverlay);
    }
  }
  // Close modal if overlay is clicked
  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
        closeModal();
    }
  });
}