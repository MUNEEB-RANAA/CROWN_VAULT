(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.querySelector('#category-grid');
    if (!grid) return;
    const segment = document.body.dataset.segment;
    const count = document.querySelector('#category-count');
    const sort = document.querySelector('#category-sort');
    const search = document.querySelector('#category-search');
    let timer;

    async function load() {
      const qs = new URLSearchParams({ segment, sort: sort?.value || 'featured' });
      if (search?.value.trim()) qs.set('search', search.value.trim());
      grid.innerHTML = '<div class="empty-state">Loading watches…</div>';
      try {
        const data = await CrownVault.api(`/api/watches?${qs.toString()}`);
        const limit = segment === "Men's" ? 12 : segment === "Women's" ? 10 : 5;
        const watches = data.watches.slice(0, limit);
        if (count) count.textContent = `${watches.length} ${segment === 'Smartwatch' ? 'smartwatch' : 'watch'}${watches.length === 1 ? '' : 'es'} available now`;
        grid.innerHTML = watches.length ? watches.map(CrownVault.productCard).join('') : '<div class="empty-state">No watches are available in this collection yet.</div>';
      } catch (err) {
        grid.innerHTML = `<div class="empty-state">${err.message}</div>`;
      }
    }
    sort?.addEventListener('change', load);
    search?.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 220); });
    await load();
  });
})();
