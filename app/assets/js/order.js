(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.querySelector('#order-content');
    const id = new URLSearchParams(location.search).get('id');
    const esc = CrownVault.escapeHtml;
    const states = ['ORDER_PLACED','CONFIRMED','PREPARING','SHIPPED','DELIVERED'];
    const label = value => value.replaceAll('_',' ').toLowerCase();
    async function render() {
      try {
        await CrownVault.refreshSession();
        const { order } = await CrownVault.api(`/api/orders/${encodeURIComponent(id)}`);
        const status = order.status === 'Payment Confirmed' ? 'ORDER_PLACED' : order.status;
        const index = states.indexOf(status);
        root.innerHTML = `<div class="order-heading"><p class="eyebrow">Your CrownVault order</p><h1>${status === 'CANCELLED' ? 'Order cancelled.' : 'Your next chapter in time.'}</h1><p class="lede">${esc(order.id)} · ${esc(new Date(order.createdAt).toLocaleDateString())}</p><span class="status-pill">${esc(label(status))}</span><p>No payment has been collected. This is a marketplace prototype.</p></div><ol class="order-timeline">${states.map((s,i)=>`<li class="${i <= index ? 'complete' : ''}" ${i === index ? 'aria-current="step"' : ''}><span>${i < index ? '✓' : i+1}</span>${esc(label(s))}</li>`).join('')}</ol><div class="order-columns"><section class="form-card"><h2>Your watches</h2>${order.items.map(item=>`<article class="collection-item"><img src="${esc(item.image)}" alt="${esc(item.brand)} ${esc(item.model)}"><div><h3>${esc(item.brand)} ${esc(item.model)}</h3><p>${CrownVault.money(item.price)}</p></div></article>`).join('')}<p class="cart-total">Total ${CrownVault.money(order.total)}</p></section><section class="form-card"><h2>Delivery details</h2><p>${esc(order.shipping.name)}</p><p>${esc(order.shipping.address)}</p><p>${esc(order.shipping.city)}, ${esc(order.shipping.country)}</p><p>${esc(order.shipping.email)}</p><h3>Order updates</h3>${(order.history || [{status,at:order.createdAt}]).map(h=>`<p>${esc(label(h.status))} · ${esc(new Date(h.at).toLocaleString())}</p>`).join('')}</section></div><div class="form-actions"><a class="btn btn-dark" href="dashboard.html">My dashboard</a><a class="btn" href="buy-watches.html">Continue browsing</a><button class="btn" id="refresh-order">Refresh status</button></div>`;
        document.querySelector('#refresh-order').onclick = render;
        if (CrownVault.state.user?.role === 'admin') {
          const options = {ORDER_PLACED:['CONFIRMED','CANCELLED'],CONFIRMED:['PREPARING','CANCELLED'],PREPARING:['SHIPPED','CANCELLED'],SHIPPED:['DELIVERED']}[status] || [];
          if (options.length) {
            const panel = document.createElement('form'); panel.className = 'form-card';
            panel.innerHTML = `<h2>Manage order</h2><label for="next-status">Next status</label><select id="next-status">${options.map(s=>`<option value="${s}">${label(s)}</option>`).join('')}</select><button class="btn btn-dark">Update status</button><p role="status"></p>`;
            root.append(panel);
            panel.onsubmit = async e => { e.preventDefault(); const button=panel.querySelector('button');button.disabled=true; try { await CrownVault.api(`/api/orders/${encodeURIComponent(id)}/status`,{method:'PATCH',body:{status:panel.querySelector('select').value}}); await render(); } catch(err) {panel.querySelector('p').textContent=err.message;button.disabled=false;} };
          }
        }
      } catch(err) { root.textContent = err.message; if (/sign in/i.test(err.message)) location.href=`login.html?next=${encodeURIComponent('order.html?id='+id)}`; }
    }
    await render();
  });
})();
