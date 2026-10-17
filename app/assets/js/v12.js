(() => {
  function labelFields() {
    document.querySelectorAll('.field').forEach((field, index) => {
      const input = field.querySelector('input,select,textarea');
      const label = field.querySelector('label');
      if (input && label) {
        input.id ||= `field-${index}`;
        label.htmlFor = input.id;
      }
    });
  }

  function initHeaderActions() {
    const header = document.querySelector('.header-inner');
    const search = document.querySelector('#search-button');
    if (!header || !search) return;
    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const bag = document.createElement('a');
    bag.href = 'cart.html';
    bag.className = 'header-bag';
    bag.setAttribute('aria-label', 'Open purchase bag');
    bag.textContent = 'Bag';
    actions.append(bag, search);
    header.append(actions);
  }

  function initHelp() {
    const help = document.createElement('details');
    help.className = 'cv-help';
    help.innerHTML = '<summary>Need help?</summary><div><h2>CrownVault guide</h2><p>Choose what you need help with.</p><a href="buy-watches.html">Find a watch →</a><a href="cart.html">Review your bag →</a><a href="dashboard.html">Track your orders →</a><a href="sell-watch.html">Upload and sell a watch →</a><a href="contact.html">Send a question →</a><small>Orders are demonstrations; no payment is collected.</small></div>';
    document.body.append(help);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && help.open) {
        help.open = false;
        help.querySelector('summary').focus();
      }
    });
  }

  function initFilm() {
    const video = document.querySelector('#hero-video');
    const button = document.querySelector('#film-toggle');
    if (!video || !button) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = true;
    let filmVisible = video.closest('.hero-film').style.opacity !== '0';
    let intent = null;
    let pendingPlay = null;
    let autoplayBlocked = false;
    button.hidden = false;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';

    function updateLabel() {
      button.textContent = video.paused ? 'Play film' : 'Pause film';
      button.setAttribute('aria-label', video.paused ? 'Play background film' : 'Pause background film');
    }

    function shouldPlay() {
      return inView && filmVisible && !document.hidden && intent !== 'pause' && (!reduced.matches || intent === 'play');
    }

    function syncPlayback() {
      if (!shouldPlay()) {
        if (pendingPlay) pendingPlay.interrupted = true;
        video.pause();
        updateLabel();
        return;
      }
      // Startup, media-ready and visibility events share a single play request.
      if (pendingPlay || autoplayBlocked || video.error || !video.paused) return;
      const attempt = { interrupted: false };
      pendingPlay = attempt;
      let result;
      try {
        result = video.play();
      } catch (error) {
        pendingPlay = null;
        autoplayBlocked = error.name === 'NotAllowedError';
        updateLabel();
        return;
      }
      Promise.resolve(result).then(() => {
        if (!shouldPlay()) video.pause();
        if (pendingPlay === attempt) pendingPlay = null;
        updateLabel();
      }, error => {
        if (pendingPlay === attempt) pendingPlay = null;
        if (error.name === 'NotAllowedError') autoplayBlocked = true;
        updateLabel();
        // A hide/show during buffering can abort play; retry once it is visible again.
        if (error.name === 'AbortError' && attempt.interrupted && shouldPlay()) syncPlayback();
      });
    }

    button.addEventListener('click', () => {
      intent = video.paused ? 'play' : 'pause';
      autoplayBlocked = false;
      syncPlayback();
    });
    video.addEventListener('play', updateLabel);
    video.addEventListener('pause', updateLabel);
    video.addEventListener('canplay', syncPlayback);
    video.addEventListener('loadeddata', syncPlayback);
    video.addEventListener('error', () => { button.hidden = true; });
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('pageshow', syncPlayback);
    document.addEventListener('cv:filmvisibility', event => {
      filmVisible = event.detail.visible;
      syncPlayback();
    });
    reduced.addEventListener('change', () => { intent = null; syncPlayback(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        syncPlayback();
      }, { threshold: 0 }).observe(video);
    }
    syncPlayback();
  }

  function initPanelFocus() {
    const panelIds = [['#navigation-drawer', '#menu-button'], ['#search-panel', '#search-button']];
    panelIds.forEach(([selector, triggerSelector]) => {
      const panel = document.querySelector(selector);
      if (!panel) return;
      let wasOpen = false;
      function sync() {
        const open = panel.getAttribute('aria-hidden') !== 'true';
        panel.inert = !open;
        if (open && !wasOpen) panel.querySelector('button,input,a')?.focus();
        if (!open && wasOpen && panel.contains(document.activeElement)) document.querySelector(triggerSelector)?.focus();
        wasOpen = open;
      }
      sync();
      new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['aria-hidden'] });
      panel.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const elements = [...panel.querySelectorAll('a[href],button,input')].filter(element => !element.hidden && element.offsetParent !== null);
        if (!elements.length) return;
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
    });
  }

  async function loadAdminOrders() {
    if (!document.querySelector('#dash-orders')) return;
    await CrownVault.refreshSession();
    if (CrownVault.state.user?.role !== 'admin') return;
    try {
      const { orders } = await CrownVault.api('/api/admin/orders');
      const section = document.createElement('section');
      section.className = 'form-card';
      section.innerHTML = '<h2>Manage all orders</h2>' + (orders.length
        ? orders.map(order => `<p><a href="order.html?id=${encodeURIComponent(order.id)}">${CrownVault.escapeHtml(order.id)} · ${CrownVault.escapeHtml(order.status)}</a></p>`).join('')
        : '<p>No orders have been placed yet.</p>');
      document.querySelector('#dashboard-content').append(section);
    } catch (error) { CrownVault.toast(error.message); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    labelFields();
    initHeaderActions();
    initHelp();
    initFilm();
    initPanelFocus();
    loadAdminOrders();
  });
})();
