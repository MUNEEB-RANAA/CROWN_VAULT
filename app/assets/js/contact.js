(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#contact-form'); if (!form) return;
    const subject = new URLSearchParams(location.search).get('subject');
    if (subject) form.elements.subject.value = subject;
    form.addEventListener('submit', async e => {
      e.preventDefault(); const msg = document.querySelector('#contact-message');
      try {
        await CrownVault.api('/api/contact', { method:'POST', body:Object.fromEntries(new FormData(form).entries()) });
        msg.textContent = 'Message received. CrownVault will follow up through the contact details provided.';
        form.reset();
      } catch (err) { msg.textContent = err.message; }
    });
  });
})();
