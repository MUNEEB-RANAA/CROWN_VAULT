(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.querySelector('#catalog-grid');
    if (!grid) return;
    const search = document.querySelector('#catalog-search');
    const brand = document.querySelector('#brand-filter');
    const condition = document.querySelector('#condition-filter');
    const segment = document.querySelector('#segment-filter');
    const sort = document.querySelector('#sort-filter');
    const count = document.querySelector('#catalog-count');
    const title = document.querySelector('#catalog-title');
    const pageType = document.body.dataset.catalogType || 'all';
    const params = new URLSearchParams(location.search);
    if (params.get('search') && search) search.value = params.get('search');
    if (params.get('segment') && segment) {
      segment.value = params.get('segment');
      if (title) title.textContent = params.get('segment') === 'Smartwatch' ? 'Smartwatches' : `${params.get('segment')} Watches`;
      document.body.classList.add('segment-active');
    }

    let debounce;
    async function load() {
      const qs = new URLSearchParams();
      if (search?.value.trim()) qs.set('search', search.value.trim());
      if (brand?.value && brand.value !== 'all') qs.set('brand', brand.value);
      if (condition?.value && condition.value !== 'all') qs.set('condition', condition.value);
      if (segment?.value && segment.value !== 'all') qs.set('segment', segment.value);
      if (sort?.value) qs.set('sort', sort.value);
      if (pageType === 'preowned') qs.set('preowned', 'true');
      if (pageType === 'new') qs.set('preowned', 'false');
      grid.innerHTML = '<div class="empty-state">Loading watches…</div>';
      try {
        const data = await CrownVault.api(`/api/watches?${qs}`);
        if (brand && brand.options.length <= 1) {
          brand.innerHTML = '<option value="all">All brands</option>' + data.brands.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        count.textContent = `${data.watches.length} watch${data.watches.length === 1 ? '' : 'es'} available`; 
        grid.innerHTML = data.watches.length ? data.watches.map(CrownVault.productCard).join('') : '<div class="empty-state">No watches match these filters.</div>';
      } catch (err) {
        grid.innerHTML = `<div class="empty-state">${err.message}</div>`;
      }
    }

    search?.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(load, 250); });
    brand?.addEventListener('change', load);
    condition?.addEventListener('change', load);
    segment?.addEventListener('change', load);
    sort?.addEventListener('change', load);
    await load();
    if (params.get('segment') && location.hash === '#catalog-results') {
      setTimeout(() => document.querySelector('#catalog-results')?.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
    }
  });
})();
