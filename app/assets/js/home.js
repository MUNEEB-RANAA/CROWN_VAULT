(() => {
  function initStory() {
    const story = document.querySelector('.hero-story');
    const stage = story?.querySelector('.hero-stage');
    const film = story?.querySelector('.hero-film');
    const copy = story?.querySelector('.hero-copy');
    const paths = story?.querySelector('.path-stage');
    if (!stage || !film || !copy || !paths) return;

    const panels = [...paths.querySelectorAll('.path-panel')];
    const desktop = matchMedia('(min-width: 901px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let active = false;
    let frame = 0;
    let previousTime = 0;
    let progress = 0;
    let top = 0;
    let distance = 1;
    let filmVisible = true;

    const clamp = value => Math.min(1, Math.max(0, value));
    const ease = value => value * value * (3 - 2 * value);
    const between = (value, start, end) => ease(clamp((value - start) / (end - start)));
    const targetProgress = () => clamp((window.scrollY - top) / distance);

    function paint(value) {
      const dissolve = between(value, 0.16, 0.66);
      const textFade = between(value, 0.06, 0.34);
      film.style.opacity = String(1 - dissolve);
      film.style.transform = `translate3d(0, ${-24 * dissolve}px, 0) scale(${1 - 0.025 * dissolve})`;
      film.style.pointerEvents = dissolve > 0.9 ? 'none' : '';
      film.inert = dissolve > 0.9;
      copy.style.opacity = String(1 - textFade);
      copy.style.transform = `translate3d(0, ${-16 * textFade}px, 0)`;
      copy.inert = textFade > 0.9;
      const nextVisible = dissolve < 0.99;
      if (filmVisible !== nextVisible) {
        filmVisible = nextVisible;
        document.dispatchEvent(new CustomEvent('cv:filmvisibility', { detail: { visible: filmVisible } }));
      }
      paths.inert = dissolve < 0.8;
      paths.style.pointerEvents = paths.inert ? 'none' : 'auto';
      panels.forEach((panel, index) => {
        const reveal = between(value, 0.28 + index * 0.045, 0.65 + index * 0.045);
        panel.style.opacity = String(reveal);
        panel.style.transform = `translate3d(0, ${28 * (1 - reveal)}px, 0)`;
      });
    }

    function tick(time) {
      frame = 0;
      if (!active || document.hidden) return;
      const target = targetProgress();
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
      previousTime = time;
      progress += (target - progress) * (1 - Math.exp(-elapsed / 75));
      if (Math.abs(target - progress) < 0.0005) progress = target;
      paint(progress);
      if (progress !== target) frame = requestAnimationFrame(tick);
      else previousTime = 0;
    }

    function requestFrame() {
      if (active && !frame && !document.hidden) frame = requestAnimationFrame(tick);
    }

    function measure() {
      if (!active) return;
      // Layout is measured only on resize; scroll frames update transforms and opacity.
      top = story.getBoundingClientRect().top + window.scrollY;
      distance = Math.max(1, story.offsetHeight - stage.offsetHeight);
      progress = targetProgress();
      paint(progress);
    }

    function configure() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      active = desktop.matches && !reduced.matches;
      story.classList.toggle('motion-active', active);
      [film, copy, paths, ...panels].forEach(element => {
        element.removeAttribute('style');
        element.inert = false;
      });
      if (!active) {
        filmVisible = true;
        document.dispatchEvent(new CustomEvent('cv:filmvisibility', { detail: { visible: true } }));
      }
      measure();
    }

    desktop.addEventListener('change', configure);
    reduced.addEventListener('change', configure);
    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('pageshow', measure);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      if (!document.hidden) measure();
    });
    configure();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initStory();
    const available = document.querySelector('#available-now-grid');
    const featured = document.querySelector('#featured-grid');
    if (!available && !featured) return;
    try {
      const { watches } = await CrownVault.api('/api/watches?sort=featured');
      if (available) available.innerHTML = watches.length
        ? watches.slice(0, 8).map(CrownVault.productCard).join('')
        : '<div class="empty-state">New watches will appear here when available.</div>';
      if (featured) featured.innerHTML = watches.filter(watch => watch.featured).slice(0, 3).map(CrownVault.productCard).join('');
    } catch (error) {
      for (const grid of [available, featured].filter(Boolean)) {
        grid.innerHTML = `<div class="empty-state">${CrownVault.escapeHtml(error.message)} <a href="buy-watches.html">Browse the collection</a></div>`;
      }
    }
  });
})();
