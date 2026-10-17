(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.querySelector('#watch-detail');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { root.innerHTML = '<div class="empty-state">No watch selected.</div>'; return; }
    try {
      const { watch } = await CrownVault.api(`/api/watches/${encodeURIComponent(id)}`);
      const esc = CrownVault.escapeHtml;
      document.title = `${watch.brand} ${watch.model} | CrownVault`;
      const gallery = [...new Set([watch.image, ...(watch.gallery || [])].filter(Boolean))];
      const sold = watch.available === false;
      const buy = sold
        ? '<button class="btn btn-dark buy-now-large" type="button" disabled>Sold / unavailable</button>'
        : `<button class="btn btn-dark buy-now-large" data-buy="${watch.id}" type="button">Buy now · ${CrownVault.money(watch.price)}</button>`;
      const specs = [
        ['Reference',watch.reference],['Year',watch.year],['Movement',watch.movement],['Case material',watch.caseMaterial],
        ['Case size',watch.caseSize],['Dial',watch.dial],['Strap / Bracelet',watch.strap],['Water resistance',watch.waterResistance],
        ['Category',watch.category],['Collection',watch.segment],['Condition',watch.condition],['Box & papers',watch.boxPapers],
        ['Seller',watch.seller],['Warranty',watch.warranty],['Authenticity',watch.authenticity],['Delivery',watch.delivery],
        ['Service history',watch.serviceHistory]
      ].filter(([,value]) => value && value !== 'Not specified');

      root.innerHTML = `
        <div class="detail-media detail-media-gallery">
          <img id="detail-main-image" src="${gallery[0]}" alt="${esc(watch.brand)} ${esc(watch.model)}">
          ${gallery.length > 1 ? `<div class="detail-thumbs">${gallery.map((src,i)=>`<button type="button" class="detail-thumb ${i===0?'active':''}" data-src="${esc(src)}" aria-label="View watch photo ${i+1}"><img src="${src}" alt=""></button>`).join('')}</div>` : ''}
        </div>
        <div class="detail-panel">
          <p class="eyebrow">${esc(watch.segment) || 'CrownVault'} · ${esc(watch.brand)} · ${esc(watch.condition)}</p>
          <h1>${esc(watch.model)}</h1>
          <p class="detail-reference">Reference ${esc(watch.reference)}</p>
          <p class="detail-price">${CrownVault.money(watch.price)}</p>
          <p class="detail-desc">${esc(watch.description)}</p>

          <div class="purchase-panel">
            ${buy}
            <div class="purchase-secondary">
              <button class="text-action" data-wishlist="${watch.id}" type="button">Save watch</button>
              <button class="text-action" data-compare="${watch.id}" type="button" ${sold ? 'disabled' : ''}>Compare</button>
              <button class="text-action" data-cart="${watch.id}" type="button" ${sold ? 'disabled' : ''}>${sold ? 'Sold / unavailable' : 'Add to purchase bag'}</button>
            </div>
            <p class="purchase-note">Price shown clearly · direct purchase · insured delivery language · marketplace verification</p>
          </div>

          <div class="detail-trust-strip">
            <span><b>Authenticity</b>${esc(watch.authenticity) || 'Marketplace review'}</span>
            <span><b>Warranty</b>${esc(watch.warranty) || 'CrownVault coverage'}</span>
            <span><b>Delivery</b>${esc(watch.delivery) || 'Insured delivery'}</span>
          </div>

          <div class="seller-summary"><div><span class="spec-label">Offered by</span><strong>${esc(watch.seller) || 'CrownVault Verified Partner'}</strong></div><div><span class="spec-label">Availability</span><strong>${sold ? 'Sold' : 'Available now'}</strong></div></div>

          <h2 class="spec-heading">Watch details</h2>
          <div class="spec-grid">${specs.map(([label,value]) => `<div class="spec"><span class="spec-label">${esc(label)}</span><span class="spec-value">${esc(value)}</span></div>`).join('')}</div>
          <div class="detail-question"><a class="btn" href="contact.html?subject=${encodeURIComponent(`Question about ${watch.brand} ${watch.model}`)}">Ask CrownVault about this watch</a></div>
          ${watch.preOwned && !sold ? `<form class="offer-box" id="offer-form"><input id="offer-amount" type="number" min="1" placeholder="Your offer (USD)" aria-label="Offer amount"><button class="btn" type="submit">Make an offer</button></form>` : ''}
        </div>`;

      root.querySelectorAll('.detail-thumb').forEach(btn => btn.addEventListener('click', () => {
        const main = root.querySelector('#detail-main-image');
        main.src = btn.dataset.src;
        root.querySelectorAll('.detail-thumb').forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
      }));

      document.querySelector('#offer-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!CrownVault.state.user) { location.href = `login.html?next=${encodeURIComponent(location.pathname+location.search)}`; return; }
        try {
          const amount = Number(document.querySelector('#offer-amount').value);
          await CrownVault.api('/api/offers', { method:'POST', body:{ watchId: watch.id, amount } });
          CrownVault.toast('Offer submitted.'); e.target.reset();
        } catch (err) { CrownVault.toast(err.message); }
      });
    } catch (err) {
      root.innerHTML = `<div class="empty-state">${err.message}</div>`;
    }
  });
})();
