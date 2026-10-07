// Hero rotation: one of three case photos, chosen at random per page load.
// NOTE ON FRAMING: background-position is NOT set here any more. It lives in
// style.css, keyed off the data-case attribute this script sets, so that a
// media query can give each photo a different crop on phones. (Setting it
// inline here would win over any stylesheet rule and make that impossible.)
const heroCases = [
  {
    key: 'cz',
    img: 'images/hero-prague-archive.jpg',
    caption: 'Czech National Archive, Prague, Czech Republic. Photographed 2025'
  },
  {
    key: 'fi',
    img: 'images/hero-valamo-monastery.jpg',
    caption: 'New Valamo Monastery, Heinävesi, Finland. Photographed 2026'
  },
  {
    key: 'am',
    img: 'images/hero-togh-karabakh.jpg',
    caption: 'Togh, Nagorno-Karabakh. Photographed 2014'
  }
];

(function initHeroRotation(){
  const choice = heroCases[Math.floor(Math.random() * heroCases.length)];
  const heroPhoto = document.querySelector('.hero-photo');
  const caption = document.getElementById('heroCaption');
  const captionText = caption ? caption.querySelector('.hero-caption-text') : null;

  if (heroPhoto) {
    heroPhoto.style.backgroundImage =
      `linear-gradient(15deg, rgba(28,27,24,0.35) 0%, rgba(28,27,24,0.0) 55%), url('${choice.img}')`;
    // Framing is handled by CSS — see .hero-photo[data-case="…"] in style.css
    heroPhoto.dataset.case = choice.key;
  }
  if (caption) {
    caption.classList.remove('case-cz','case-fi','case-am');
    caption.classList.add('case-' + choice.key);
  }
  if (captionText) {
    captionText.textContent = choice.caption;
  }
  document.querySelectorAll('.hero-cases span').forEach(span => {
    span.classList.toggle('is-active', span.classList.contains('case-' + choice.key));
  });
})();

// Lock the hero to the height of the screen as first loaded.
// On phones the visible height changes while scrolling (the address bar
// collapses and reappears). If the hero follows that change, its cover-sized
// photo rescales and appears to zoom. So the height is measured once and only
// re-measured when the WIDTH changes, i.e. a rotation or a real window
// resize, never on scroll-driven height changes.
(function lockHeroHeight(){
  const root = document.documentElement;
  let lastWidth = 0;
  function measure(){
    const w = window.innerWidth;
    if (w === lastWidth) return;
    lastWidth = w;
    root.style.setProperty('--hero-h', window.innerHeight + 'px');
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', function(){
    // innerHeight isn't final until the rotation settles.
    lastWidth = 0;
    setTimeout(measure, 250);
  });
})();

// Scroll progress bar (the "shifting border" that redraws as you scroll)
const progressBar = document.getElementById('borderlineProgress');

function onScroll(){
  if (!progressBar) return;
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.querySelector('.main-nav');
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    mainNav.classList.toggle('is-open');
  });
}

// Close mobile nav when a link is clicked
document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
  });
});

// In-page navigation.
//
// Rather than letting the browser follow the #fragment, this scrolls to the
// target directly. Two reasons:
//   1. It guarantees an instant jump regardless of any scroll-behavior value
//      inherited or set elsewhere.
//   2. Fragment navigation is blocked in some embedded/sandboxed contexts
//      (the Claude preview pane, for one), where clicking an anchor is
//      treated as leaving the page rather than moving within it.
//
// The URL is still updated so links remain shareable and the back button
// works. Offset accounts for the fixed header, matching the scroll-margin-top
// used in style.css.
(function initInPageNav(){
  function headerOffset(){
    // Exactly the header's height — no extra gap. Any additional offset
    // scrolls to a point ABOVE the section's top edge, which shows a strip
    // of the previous section under the header. That's invisible where two
    // sections share a background but obvious where it changes (Publications
    // is dark, Engagement follows the deeper-paper Fellowships).
    const header = document.getElementById('siteHeader');
    return header ? header.offsetHeight : 72;
  }

  function jumpTo(hash, pushState){
    const id = hash.slice(1);
    // '#top' means the very top of the document.
    const target = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !target) return false;

    // If the visitor starts scrolling themselves, stop re-aligning so the
    // page never pulls them back.
    let userMoved = false;
    const stop = function(){ userMoved = true; };
    ['wheel','touchstart','keydown'].forEach(function(ev){
      window.addEventListener(ev, stop, { once: true, passive: true });
    });
    function align(){
      if (userMoved) return;
      const y = target
        ? window.scrollY + target.getBoundingClientRect().top - headerOffset()
        : 0;
      // Ceil rather than floor: landing a fraction of a pixel short would
      // leave a hairline of the previous section showing under the header.
      const top = Math.max(0, Math.ceil(y));
      if (Math.abs(window.scrollY - top) > 1) {
        window.scrollTo({ top: top, behavior: 'auto' });
      }
    }
    align();
    // Re-check after the jump. The very first jump from the top of the page
    // is the one that triggers late layout work: phone browsers collapse
    // the address bar on the first big scroll, and web fonts or images may
    // still be settling. Any of these can move the target after the first
    // measurement, leaving its heading under the header. Re-measuring over
    // the next few frames, and once fonts are ready, puts it back flush.
    // Each pass does nothing if the section is already in place.
    requestAnimationFrame(function(){ requestAnimationFrame(align); });
    setTimeout(align, 150);
    setTimeout(align, 400);
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(align);
    }

    if (pushState && window.history && history.pushState) {
      history.pushState(null, '', hash);
    }
    return true;
  }

  document.addEventListener('click', function(e){
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;
    if (jumpTo(hash, true)) e.preventDefault();
  });

  // Back/forward between sections.
  window.addEventListener('popstate', function(){
    if (location.hash) jumpTo(location.hash, false);
  });

  // A page opened directly at a #section should land there too — done after
  // load so images have their final heights and the offset is correct.
  if (location.hash) {
    window.addEventListener('load', function(){
      jumpTo(location.hash, false);
    });
  }
})();
