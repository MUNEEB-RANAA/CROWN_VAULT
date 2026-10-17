(() => {
  const compressImage = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const max = window.CrownVault?.offline ? 960 : 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', window.CrownVault?.offline ? .70 : .84));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('#sell-form');
    if (!form) return;
    const message = document.querySelector('#sell-message');
    const input = document.querySelector('#listing-images');
    const year = form.elements.namedItem('year');
    if (year) year.max = String(new Date().getFullYear() + 1);
    const preview = document.querySelector('#listing-preview');
    const market = document.querySelector('#seller-market-grid');

    async function loadMarket() {
      if (!market) return;
      market.innerHTML = '<div class="empty-state">Loading watches for sale…</div>';
      try {
        const data = await CrownVault.api('/api/watches?preowned=true&sort=year-desc');
        market.innerHTML = data.watches.length ? data.watches.slice(0, 8).map(CrownVault.productCard).join('') : '<div class="empty-state">No pre-owned watches are live yet.</div>';
      } catch (err) { market.innerHTML = `<div class="empty-state">${err.message}</div>`; }
    }

    await CrownVault.refreshSession();
    await loadMarket();
    if (!CrownVault.state.user) {
      message.innerHTML = `You can prepare the listing now. <a href="login.html?next=sell-watch.html"><u>Sign in</u></a> when you are ready to publish it.`;
    }

    let previewUrls = [];
    input?.addEventListener('change', () => {
      previewUrls.forEach(URL.revokeObjectURL); previewUrls = [];
      if ([...(input.files || [])].some(f => !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 12 * 1024 * 1024) || input.files.length > 5) { message.textContent = 'Choose 1–5 JPG, PNG or WebP photos, each under 12MB.'; input.value = ''; if (preview) preview.innerHTML = ''; return; }
      const files = [...(input.files || [])].slice(0, 5);
      if (!preview) return;
      preview.innerHTML = files.map((file, i) => `<figure><img src="${(previewUrls[i] = URL.createObjectURL(file))}" alt="Selected watch photo ${i+1}"><figcaption>Photo ${i+1}</figcaption></figure>`).join('');
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!CrownVault.state.user) { location.href = 'login.html?next=sell-watch.html'; return; }
      const fd = new FormData(form);
      const files = [...(input?.files || [])].slice(0, 5);
      if (!files.length) { message.textContent = 'Add at least one clear photo of the watch.'; return; }
      const button = form.querySelector('button[type=submit]'); button.disabled = true;
      message.textContent = 'Preparing your photos and publishing the listing…';
      try {
        const images = await Promise.all(files.map(compressImage));
        const body = Object.fromEntries(fd.entries()); body.images = images;
        const { listing, watch, warning } = await CrownVault.api('/api/listings', { method:'POST', body });
        const esc = CrownVault.escapeHtml;
        message.innerHTML = `Your watch is live. <a href="watch.html?id=${encodeURIComponent(watch.id)}"><u>View ${esc(watch.brand)} ${esc(watch.model)}</u></a>${warning ? `<br><span class="form-warning">${esc(warning)}</span>` : ''}`;
        form.reset(); previewUrls.forEach(URL.revokeObjectURL); previewUrls = []; if (preview) preview.innerHTML = '';
        await loadMarket();
      } catch (err) { message.textContent = err.message; } finally { button.disabled = false; }
    });
  });
})();
