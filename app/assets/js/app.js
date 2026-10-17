(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = { user: null };

  const offline = location.protocol === 'file:';

  async function api(url, options = {}) {
    if (offline && window.CrownVaultOffline) {
      if (url.startsWith('/api/watches')) return window.CrownVaultOffline.handle(url, options);
      throw new Error('Start CrownVault with npm start and open http://localhost:3000 to use your account.');
    }
    const opts = { credentials: 'same-origin', ...options };
    opts.headers = { ...(options.headers || {}) };
    if (options.body && typeof options.body !== 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(options.body);
    }
    try {
      const res = await fetch(url, opts);
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    } catch (err) {
      throw err;
    }
  }

  function money(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  // Escapes text pulled from watch/listing/user data before it is inserted into innerHTML.
  // Seller-submitted fields (brand, model, description, notes...) are user input and must
  // never be trusted as raw HTML — this closes the stored-XSS hole where a crafted watch
  // name or description could run script in another visitor's browser.
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function toast(message) {
    let node = $('#cv-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'cv-toast'; node.className = 'toast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function productCard(watch) {
    const badge = watch.preOwned ? 'Pre-Owned' : 'Available now';
    const collection = watch.segment === 'Smartwatch' ? 'Smartwatch' : (watch.segment || 'CrownVault');
    const brand = escapeHtml(watch.brand);
    const model = escapeHtml(watch.model);
    const sold = watch.available === false;
    const search = escapeHtml([watch.brand, watch.model, watch.reference, watch.segment].join(' '));
    return `
      <article class="product-card" data-search="${search}">
        <a class="product-image" href="watch.html?id=${encodeURIComponent(watch.id)}" aria-label="View ${brand} ${model}">
          <img src="${watch.image}" alt="${brand} ${model}" loading="lazy">
          <span class="product-badge">${sold ? 'Sold' : badge}</span>
        </a>
        <div class="product-body">
          <p class="product-brand">${escapeHtml(collection)} · ${brand}</p>
          <h3 class="product-title"><a href="watch.html?id=${encodeURIComponent(watch.id)}">${model}</a></h3>
          <p class="product-price">${money(watch.price)}</p>
          <p class="product-meta">${escapeHtml(watch.condition)} · ${escapeHtml(watch.movement)}</p>
          <button class="btn btn-dark product-buy" data-buy="${watch.id}" type="button" ${sold ? 'disabled' : ''}>${sold ? 'Sold' : 'Buy now'}</button>
          <div class="card-actions-clean">
            <a href="watch.html?id=${encodeURIComponent(watch.id)}">Details</a>
            <button data-wishlist="${watch.id}" type="button">Save</button>
            <button data-compare="${watch.id}" type="button" ${sold ? 'disabled' : ''}>Compare</button>
          </div>
        </div>
      </article>`;
  }



  async function action(endpoint, watchId, method = 'POST') {
    if (!state.user) {
      const here = location.protocol === 'file:' ? `${location.pathname.split('/').pop()}${location.search}` : `${location.pathname}${location.search}`;
      const next = encodeURIComponent(here);
      location.href = `login.html?next=${next}`;
      return;
    }
    try {
      await api(endpoint, { method, body: { watchId } });
      toast(method === 'DELETE' ? 'Removed.' : endpoint === '/api/cart' ? 'Added to your bag. Open Bag to checkout.' : 'Saved.');
      document.dispatchEvent(new Event('cv:cart-updated'));
    } catch (err) { toast(err.message); }
  }

  async function buyNow(watchId) {
    if (!state.user) {
      sessionStorage.setItem('cv_pending_buy', watchId);
      const here = location.protocol === 'file:' ? `${location.pathname.split('/').pop()}${location.search}` : `${location.pathname}${location.search}`;
      const next = encodeURIComponent(here);
      location.href = `login.html?next=${next}`;
      return;
    }
    try {
      await api('/api/buy-now', { method: 'POST', body: { watchId } });
      location.href = 'checkout.html';
    } catch (err) { toast(err.message); }
  }

  async function compareWatch(watchId) {
    if (state.user) {
      try { await api('/api/compare', { method:'POST', body:{ watchId } }); toast('Added to compare.'); }
      catch (err) { toast(err.message); }
      return;
    }
    const key = 'cv_guest_compare';
    const ids = JSON.parse(localStorage.getItem(key) || '[]');
    if (!ids.includes(watchId) && ids.length >= 3) { toast('You can compare up to 3 watches.'); return; }
    if (!ids.includes(watchId)) ids.push(watchId);
    localStorage.setItem(key, JSON.stringify(ids));
    toast('Added to compare.');
  }

  function bindActions(root = document) {
    root.addEventListener('click', e => {
      const buy = e.target.closest('[data-buy]');
      if (buy) { e.preventDefault(); buyNow(buy.dataset.buy); return; }
      const wish = e.target.closest('[data-wishlist]');
      if (wish) { e.preventDefault(); action('/api/wishlist', wish.dataset.wishlist); return; }
      const compare = e.target.closest('[data-compare]');
      if (compare) { e.preventDefault(); compareWatch(compare.dataset.compare); return; }
      const cart = e.target.closest('[data-cart]');
      if (cart) { e.preventDefault(); action('/api/cart', cart.dataset.cart); }
    });
  }

  async function refreshSession() {
    try {
      const data = await api('/api/auth/me');
      state.user = data.user;
    } catch { state.user = null; }
    const signIn = $('#drawer-sign-in');
    const create = $('#drawer-create-account');
    const dash = $('#drawer-dashboard');
    const logout = $('#drawer-logout');
    if (state.user) {
      if (signIn) signIn.hidden = true;
      if (create) create.hidden = true;
      if (dash) { dash.hidden = false; dash.textContent = `Dashboard · ${state.user.name.split(' ')[0]}`; }
      if (logout) logout.hidden = false;
    } else {
      if (signIn) signIn.hidden = false;
      if (create) create.hidden = false;
      if (dash) dash.hidden = true;
      if (logout) logout.hidden = true;
    }
    return state.user;
  }

  function initHeader() {
    const header = $('#site-header');
    const menu = $('#menu-button');
    const close = $('#menu-close-button');
    const drawer = $('#navigation-drawer');
    const overlay = $('#page-overlay');
    const searchButton = $('#search-button');
    const searchPanel = $('#search-panel');
    const searchClose = $('#search-close-button');

    const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 32);
    syncHeader(); window.addEventListener('scroll', syncHeader, { passive: true });

    function closeAll() {
      drawer?.classList.remove('is-open'); drawer?.setAttribute('aria-hidden', 'true');
      searchPanel?.classList.remove('is-open'); searchPanel?.setAttribute('aria-hidden', 'true');
      if (menu) menu.setAttribute('aria-expanded', 'false');
      if (searchButton) searchButton.setAttribute('aria-expanded', 'false');
      if (overlay) overlay.hidden = true;
      document.body.style.overflow = '';
    }
    function openDrawer() {
      closeAll(); drawer?.classList.add('is-open'); drawer?.setAttribute('aria-hidden', 'false');
      menu?.setAttribute('aria-expanded', 'true'); if (overlay) overlay.hidden = false; document.body.style.overflow = 'hidden';
    }
    function openSearch() {
      closeAll(); searchPanel?.classList.add('is-open'); searchPanel?.setAttribute('aria-hidden', 'false');
      searchButton?.setAttribute('aria-expanded', 'true'); if (overlay) overlay.hidden = false; document.body.style.overflow = 'hidden';
      setTimeout(() => $('#watch-search')?.focus(), 100);
    }
    menu?.addEventListener('click', openDrawer); close?.addEventListener('click', closeAll);
    searchButton?.addEventListener('click', openSearch); searchClose?.addEventListener('click', closeAll); overlay?.addEventListener('click', closeAll);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

    $('#drawer-logout')?.addEventListener('click', async e => {
      e.preventDefault();
      try { await api('/api/auth/logout', { method: 'POST' }); location.href = 'index.html'; }
      catch (err) { toast(err.message); }
    });

    $('#search-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const q = $('#watch-search')?.value.trim();
      if (q) location.href = `buy-watches.html?search=${encodeURIComponent(q)}`;
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initHeader(); bindActions(); await refreshSession();
    const pendingBuy = sessionStorage.getItem('cv_pending_buy');
    if (state.user && pendingBuy && !location.pathname.endsWith('/checkout.html')) {
      sessionStorage.removeItem('cv_pending_buy');
      try { await api('/api/buy-now', { method:'POST', body:{ watchId: pendingBuy } }); location.href='checkout.html'; return; } catch (err) { toast(err.message); }
    }
    const year = $('#current-year'); if (year) year.textContent = new Date().getFullYear();
  });

  window.CrownVault = { api, money, toast, productCard, action, buyNow, compareWatch, state, refreshSession, offline, escapeHtml };
})();
