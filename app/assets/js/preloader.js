(() => {
  const preloader = document.createElement('div');
  preloader.className = 'cv-preloader';
  preloader.setAttribute('aria-hidden', 'true');

  const logo = document.createElement('img');
  logo.src = 'assets/images/crownvault-logo-on-dark.png';
  logo.alt = '';
  logo.className = 'cv-preloader-logo';

  preloader.append(logo);
  document.body.prepend(preloader);

  window.setTimeout(() => preloader.remove(), 1000);
})();
