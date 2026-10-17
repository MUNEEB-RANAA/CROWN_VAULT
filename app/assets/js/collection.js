(() => {
  function item(watch, type) {
    const esc = CrownVault.escapeHtml;
    return `<article class="collection-item">
      <img src="${watch.image}" alt="${esc(watch.brand)} ${esc(watch.model)}">
      <div><h3><a href="watch.html?id=${encodeURIComponent(watch.id)}">${esc(watch.brand)} ${esc(watch.model)}</a></h3><p>${esc(watch.condition)} · ${CrownVault.money(watch.price)}</p></div>
      <div class="collection-actions"><a class="btn" href="watch.html?id=${encodeURIComponent(watch.id)}">View</a><button class="btn" data-remove-${type}="${watch.id}" type="button">Remove</button></div>
    </article>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const wishlist = document.querySelector('#wishlist-list');
    if (wishlist) {
      try { const { watches } = await CrownVault.api('/api/wishlist'); wishlist.innerHTML = watches.length ? watches.map(w => item(w,'wishlist')).join('') : '<div class="empty-state">Your wishlist is empty.</div>'; }
      catch (err) { if (/sign in/i.test(err.message)) location.href='login.html?next=wishlist.html'; else wishlist.innerHTML=`<div class="empty-state">${err.message}</div>`; }
      wishlist.addEventListener('click', async e => { const b=e.target.closest('[data-remove-wishlist]'); if(!b)return; await CrownVault.api('/api/wishlist',{method:'DELETE',body:{watchId:b.dataset.removeWishlist}}); b.closest('.collection-item').remove(); });
    }

    const compare = document.querySelector('#compare-content');
    if (compare) {
      const guestKey = 'cv_guest_compare';
      async function getCompareWatches() {
        try { return (await CrownVault.api('/api/compare')).watches; }
        catch (err) {
          if (!/sign in/i.test(err.message)) throw err;
          const ids = JSON.parse(localStorage.getItem(guestKey) || '[]').slice(0,3);
          const rows = await Promise.all(ids.map(id => CrownVault.api(`/api/watches/${encodeURIComponent(id)}`).then(x=>x.watch).catch(()=>null)));
          return rows.filter(Boolean);
        }
      }
      async function renderCompare() {
        try {
          const watches = await getCompareWatches();
          if (!watches.length) { compare.innerHTML='<div class="empty-state">Add up to three watches to compare. You can compare without signing in.</div>'; return; }
          const esc = CrownVault.escapeHtml;
          const rows = [
            ['Watch', w=>`<div class="compare-watch"><img src="${w.image}" alt="${esc(w.brand)} ${esc(w.model)}"><b>${esc(w.brand)} ${esc(w.model)}</b></div>`],
            ['Price',w=>CrownVault.money(w.price)],['Condition',w=>esc(w.condition)],['Year',w=>esc(w.year)],['Movement',w=>esc(w.movement)],
            ['Case',w=>esc(w.caseMaterial)],['Size',w=>esc(w.caseSize)],['Dial',w=>esc(w.dial)],['Strap / Bracelet',w=>esc(w.strap)],
            ['Water resistance',w=>esc(w.waterResistance)],['Buy',w=>`<button class="btn btn-dark compare-buy" type="button" data-buy="${w.id}">Buy now</button>`]
          ];
          compare.innerHTML = `<table class="compare-table"><tbody>${rows.map(([label,get])=>`<tr><th>${label}</th>${watches.map(w=>`<td>${get(w) || '—'}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="form-actions">${watches.map(w=>`<button class="btn" type="button" data-remove-compare="${w.id}">Remove ${esc(w.brand)}</button>`).join('')}</div>`;
        } catch (err) { compare.innerHTML=`<div class="empty-state">${err.message}</div>`; }
      }
      await renderCompare();
      compare.addEventListener('click', async e => {
        const b=e.target.closest('[data-remove-compare]'); if(!b)return;
        if (CrownVault.state.user) await CrownVault.api('/api/compare',{method:'DELETE',body:{watchId:b.dataset.removeCompare}});
        else {
          const ids=JSON.parse(localStorage.getItem(guestKey)||'[]').filter(id=>id!==b.dataset.removeCompare);
          localStorage.setItem(guestKey,JSON.stringify(ids));
        }
        await renderCompare();
      });
    }

    const cart = document.querySelector('#cart-list');
    if (cart) {
      try {
        const { items } = await CrownVault.api('/api/cart');
        cart.innerHTML = items.length ? items.map(x=>item(x.watch,'cart')).join('') : '<div class="empty-state">Your purchase bag is empty.</div>';
        const total = items.reduce((s,x)=>s+x.watch.price,0); document.querySelector('#cart-total').textContent=CrownVault.money(total);
        document.querySelector('#checkout-link').style.pointerEvents = items.length ? 'auto':'none';
        document.querySelector('#checkout-link').style.opacity = items.length ? '1':'.4';
      } catch (err) { if (/sign in/i.test(err.message)) location.href='login.html?next=cart.html'; else cart.innerHTML=`<div class="empty-state">${err.message}</div>`; }
      cart.addEventListener('click', async e=>{const b=e.target.closest('[data-remove-cart]');if(!b)return;await CrownVault.api('/api/cart',{method:'DELETE',body:{watchId:b.dataset.removeCart}});location.reload();});
    }

    const checkout = document.querySelector('#checkout-form');
    if (checkout) {
      try {
        const { items } = await CrownVault.api('/api/cart');
        checkout.querySelector('button').disabled = !items.length || items.some(x => x.watch.available === false);
        if (!items.length) document.querySelector('#checkout-message').textContent = 'Your bag is empty. Browse watches to get started.';
        if (items.some(x => x.watch.available === false)) document.querySelector('#checkout-message').textContent = 'A watch is sold. Remove it from your bag first.';
        document.querySelector('#checkout-items').innerHTML = items.map(x=>`<div class="dashboard-row"><b>${CrownVault.escapeHtml(x.watch.brand)} ${CrownVault.escapeHtml(x.watch.model)}</b><small>${CrownVault.money(x.watch.price)}</small></div>`).join('');
        document.querySelector('#checkout-total').textContent = CrownVault.money(items.reduce((s,x)=>s+x.watch.price,0));
      } catch (err) { if (/sign in/i.test(err.message)) location.href='login.html?next=checkout.html'; }
      const checkoutKey = sessionStorage.getItem('cv_checkout_key') || crypto.randomUUID();
      sessionStorage.setItem('cv_checkout_key', checkoutKey);
      checkout.addEventListener('submit', async e=>{
        e.preventDefault(); const msg=document.querySelector('#checkout-message');
        const button = checkout.querySelector('button'); button.disabled = true; msg.textContent = 'Placing your order…';
        try { const { order }=await CrownVault.api('/api/orders',{method:'POST',headers:{'Idempotency-Key':checkoutKey},body:Object.fromEntries(new FormData(checkout).entries())}); sessionStorage.removeItem('cv_checkout_key'); location.href = `order.html?id=${encodeURIComponent(order.id)}&placed=1`; }
        catch(err){msg.textContent=err.message; button.disabled=false;}
      });
    }
  });
})();
