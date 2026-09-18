(() => {
  'use strict';
  const root = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const colorPreference = window.matchMedia('(prefers-color-scheme: dark)');
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('romi-theme'); } catch {}
  if (!['dark', 'light'].includes(savedTheme)) savedTheme = null;
  function applyTheme(theme) {
    root.dataset.theme = theme;
    const dark = theme === 'dark';
    const label = dark ? 'Activar modo claro' : 'Activar modo oscuro';
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
    themeToggle.firstElementChild.textContent = dark ? '☀' : '☾';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#18131d' : '#fff5f8';
  }
  applyTheme(savedTheme || (colorPreference.matches ? 'dark' : 'light'));
  themeToggle.addEventListener('click', () => {
    savedTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('romi-theme', savedTheme); } catch {}
    applyTheme(savedTheme);
  });
  colorPreference.addEventListener('change', event => {
    if (!savedTheme) applyTheme(event.matches ? 'dark' : 'light');
  });
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.header');
  const hero = document.querySelector('.hero');
  const story = document.querySelector('.story');
  const manifesto = document.querySelector('.manifesto');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const screens = [...document.querySelectorAll('[data-screen]')];
  const chapterButtons = [...document.querySelectorAll('[data-chapter]')];
  const tag = document.querySelector('#story-tag-text');
  const tagText = ['Una conversación a tu ritmo.', 'Pequeños pasos. Tu propio ritmo.', 'Tu historia, siempre contigo.'];
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  let activeChapter = -1;
  let frame = 0;
  let bounds = {};
  let reduced = motionPreference.matches;

  root.classList.add('js-ready');
  if (!reduced) root.classList.add('motion-ready');

  // Keep the full sentence accessible, while its visual words fill with scroll.
  const sentence = document.querySelector('.word-reveal');
  const sentenceText = sentence.textContent.trim();
  const accessibleSentence = document.createElement('span');
  accessibleSentence.className = 'sr-only';
  accessibleSentence.textContent = sentenceText;
  const visualSentence = document.createElement('span');
  visualSentence.setAttribute('aria-hidden', 'true');
  for (const word of sentenceText.split(/\s+/)) {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = word;
    visualSentence.append(span, document.createTextNode(' '));
  }
  sentence.replaceChildren(accessibleSentence, visualSentence);
  const words = [...sentence.querySelectorAll('.word')];

  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: 0.13, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  function measure() {
    // Fit the pinned phone inside the space left by the copy on short mobile screens.
    const phoneSpace = document.querySelector('.story-visual').clientHeight;
    root.style.setProperty('--mobile-device-scale', clamp((phoneSpace - 24) / 565, .3, .68).toFixed(3));
    const y = window.scrollY;
    bounds = {
      heroHeight: hero.offsetHeight,
      storyTop: story.getBoundingClientRect().top + y,
      storyTravel: Math.max(1, story.offsetHeight - document.querySelector('.story-sticky').offsetHeight),
      manifestoTop: manifesto.getBoundingClientRect().top + y,
      manifestoHeight: manifesto.offsetHeight,
      viewport: window.innerHeight,
      total: Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
    };
    schedule();
  }

  function setChapter(index) {
    if (index === activeChapter) return;
    activeChapter = index;
    story.dataset.active = String(index);
    panels.forEach((panel, i) => {
      panel.classList.toggle('active', i === index);
      panel.setAttribute('aria-hidden', String(!reduced && i !== index));
      panel.inert = !reduced && i !== index;
    });
    screens.forEach((screen, i) => {
      screen.classList.toggle('active', i === index);
      screen.setAttribute('aria-hidden', String(i !== index));
    });
    chapterButtons.forEach((button, i) => {
      button.classList.toggle('active', i === index);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    tag.textContent = tagText[index];
  }

  function update() {
    frame = 0;
    const y = window.scrollY;
    root.style.setProperty('--scroll', clamp(y / bounds.total).toFixed(4));
    header.classList.toggle('scrolled', y > 25);
    if (reduced) {
      root.style.setProperty('--hero-p', '0');
      root.style.setProperty('--story-p', '0');
      words.forEach(word => word.style.opacity = '1');
      setChapter(0);
      return;
    }
    root.style.setProperty('--hero-p', clamp(y / (bounds.heroHeight * .85)).toFixed(4));
    const progress = clamp((y - bounds.storyTop) / bounds.storyTravel);
    root.style.setProperty('--story-p', progress.toFixed(4));
    setChapter(Math.min(2, Math.floor(progress * 3)));
    const wordProgress = clamp((y + bounds.viewport * .78 - bounds.manifestoTop) / (bounds.manifestoHeight * .75));
    words.forEach((word, i) => {
      const fill = clamp(wordProgress * (words.length + 3) - i);
      word.style.opacity = String(.18 + fill * .82);
    });
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  chapterButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (reduced) return;
      const position = bounds.storyTop + bounds.storyTravel * ((index + .18) / 3);
      window.scrollTo({ top: position, behavior: 'smooth' });
    });
  });

  function closeMenu() {
    mobileMenu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menú');
  }
  menuButton.addEventListener('click', () => {
    const opening = mobileMenu.hidden;
    mobileMenu.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Cerrar menú' : 'Abrir menú');
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileMenu.hidden) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!mobileMenu.hidden && !header.contains(event.target)) closeMenu();
  });
  document.querySelectorAll('.faq details').forEach(detail => {
    detail.addEventListener('toggle', measure);
  });
  motionPreference.addEventListener('change', event => {
    reduced = event.matches;
    root.classList.toggle('motion-ready', !reduced);
    activeChapter = -1;
    measure();
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 800) closeMenu();
    measure();
  }, { passive: true });
  window.addEventListener('load', measure, { once: true });
  document.fonts.ready.then(measure);
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(document.body);
  measure();
})();
