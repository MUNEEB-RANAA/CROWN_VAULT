(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    const login = document.querySelector('#login-form');
    const register = document.querySelector('#register-form');
    const candidate = new URL(new URLSearchParams(location.search).get('next') || 'dashboard.html', location.href);
    const next = candidate.origin === location.origin && /\/[a-z-]+\.html$/.test(candidate.pathname) ? candidate.pathname + candidate.search : 'dashboard.html';

    login?.addEventListener('submit', async e => {
      e.preventDefault(); const msg = document.querySelector('#auth-message');
      try {
        await CrownVault.api('/api/auth/login', { method:'POST', body:Object.fromEntries(new FormData(login).entries()) });
        location.href = next;
      } catch (err) { msg.textContent = err.message; }
    });

    register?.addEventListener('submit', async e => {
      e.preventDefault(); const msg = document.querySelector('#auth-message');
      const body = Object.fromEntries(new FormData(register).entries());
      if (body.password !== body.confirmPassword) { msg.textContent = 'Passwords do not match.'; return; }
      delete body.confirmPassword;
      try {
        await CrownVault.api('/api/auth/register', { method:'POST', body });
        location.href = next;
      } catch (err) { msg.textContent = err.message; }
    });

    const dashboard = document.querySelector('#dashboard-content');
    if (dashboard) {
      try {
        const data = await CrownVault.api('/api/dashboard');
        const esc = CrownVault.escapeHtml;
        document.querySelector('#dashboard-name').textContent = data.user.name;
        const c = data.counts;
        document.querySelector('#dashboard-stats').innerHTML = [
          ['Wishlist',c.wishlistCount],['Compare',c.compareCount],['Bag',c.cartCount],['Listings',c.listings],['Offers',c.offers],['Orders',c.orders]
        ].map(([label,value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
        document.querySelector('#dash-listings').innerHTML = data.listings.length ? data.listings.map(x => `<div class="dashboard-row dashboard-listing-row">${x.images?.[0] ? `<img src="${x.images[0]}" alt="${esc(x.brand)} ${esc(x.model)}">` : ''}<span><b>${esc(x.brand)} ${esc(x.model)}</b><small>${esc(x.status)} · ${CrownVault.money(x.price)}</small>${x.watchId ? `<a href="watch.html?id=${encodeURIComponent(x.watchId)}">View live listing →</a>` : ''}</span></div>`).join('') : '<p class="lede">No listings yet.</p>';
        document.querySelector('#dash-offers').innerHTML = data.offers.length ? data.offers.map(x => `<div class="dashboard-row"><b>${esc(x.brand)} ${esc(x.model)}</b><small>${esc(x.status)} · ${CrownVault.money(x.amount)}</small></div>`).join('') : '<p class="lede">No offers yet.</p>';
        document.querySelector('#dash-orders').innerHTML = data.orders.length ? data.orders.map(x => `<div class="dashboard-row"><a href="order.html?id=${encodeURIComponent(x.id)}"><b>${esc(x.id)}</b> → View order</a><small>${esc(x.status)} · ${CrownVault.money(x.total)}</small></div>`).join('') : '<p class="lede">No orders yet.</p>';
      } catch (err) {
        if (/sign in/i.test(err.message)) location.href = `login.html?next=dashboard.html`;
        else dashboard.innerHTML = `<div class="empty-state">${err.message}</div>`;
      }
    }
  });
})();
