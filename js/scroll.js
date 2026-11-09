/* ===================================================================
   SCROLL / STATE - Mode 6: real native free scroll, nav tracks scroll
   position continuously (moves as one unit with the headline) and
   auto-completes the transition once "DEME" is scrolled exactly half
   out of view. Panel switching (About/Gallery/Contact) still slides
   horizontally, unchanged. Hamburger menu and contact form are wired
   up FIRST, independently, so a problem below can never break those.
   =================================================================== */

const stage = document.getElementById('stage');
const siteNav = document.getElementById('site-nav');
const panelsTrack = document.getElementById('panels');
const menuToggle = document.getElementById('menu-toggle');
const menuDrawer = document.getElementById('menu-drawer');
const ctaBtn = document.getElementById('cta-btn');
const menuCorner = document.getElementById('menu-corner');
const logoCorner = document.getElementById('logo-corner');
const toTopBtn = document.getElementById('to-top');
const demeWord = document.querySelector('.hero__title span');

const panelOrder = ['about', 'gallery', 'contact'];
let currentPanel = 0;

// ===================================================================
// PART 1 - independent, critical features.
// ===================================================================

function closeMenu() {
  menuToggle.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuDrawer.classList.remove('is-open');
}

menuToggle.addEventListener('click', function () {
  const isOpen = menuToggle.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuDrawer.classList.toggle('is-open', isOpen);
});

ctaBtn.addEventListener('click', function () {
  this.classList.toggle('is-selected');
});

// ---- Footer copyright year (auto-updates, never goes stale) ----
const footerYear = document.getElementById('footer-year');
if (footerYear) footerYear.textContent = new Date().getFullYear();

const detailsField = document.getElementById('details');
detailsField.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

const contactForm = document.getElementById('contact-form');
const submitBtn = document.querySelector('.contact__submit');

contactForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const contact = document.getElementById('contact-info').value.trim();
  const details = document.getElementById('details').value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, contact, details }),
    });
    if (!response.ok) throw new Error('Request failed');

    submitBtn.textContent = 'Sent — thank you!';
    contactForm.reset();
    detailsField.style.height = 'auto';
    setTimeout(function () {
      submitBtn.textContent = 'Submit';
      submitBtn.disabled = false;
    }, 4000);
  } catch (err) {
    submitBtn.textContent = 'Something went wrong — try again';
    submitBtn.disabled = false;
    console.error('Contact form error:', err);
  }
});

// ===================================================================
// PART 2 - panel switching (horizontal slide, independent of the
// vertical scroll math below).
// ===================================================================

function setActiveNav(inContent) {
  document.querySelectorAll('[data-nav-target]').forEach(function (link) {
    const isActive = inContent && link.dataset.navTarget === panelOrder[currentPanel];
    link.classList.toggle('is-active', isActive);
  });
}

function goToPanel(panelName) {
  const idx = panelOrder.indexOf(panelName);
  if (idx === -1) return;
  currentPanel = idx;
  panelsTrack.style.transform = 'translateX(-' + (idx * 100) + 'vw)';
  document.querySelectorAll('.panel').forEach(function (panel) {
    panel.classList.toggle('is-current', panel.dataset.panel === panelName);
  });
  setActiveNav(true);
  try {
    // Coming from the landing page, or from further down another panel:
    // land at the top of the new panel either way.
    if (stage.scrollTop < demeTriggerY() || stage.scrollTop > stageHeight() + 4) {
      stage.scrollTo({ top: stageHeight(), behavior: 'smooth' });
    }
  } catch (err) {
    console.error('DEME nav system: scroll-to-content failed:', err);
  }
}

function goToLanding() {
  stage.scrollTo({ top: 0, behavior: 'smooth' });
}

toTopBtn.addEventListener('click', goToLanding);

document.querySelectorAll('[data-nav-target]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const target = this.dataset.navTarget;
    if (target === 'home') {
      goToLanding();
    } else {
      goToPanel(target);
    }
    closeMenu();
  });
});

// ===================================================================
// PART 3 - Mode 6: the vertical scroll system.
// ===================================================================

let lastScrollTop = 0;
let autoSnapping = false;
let touchActive = false;
let pendingSnapDirection = null; // 'down' | 'up' | null - set if a crossing happens mid-touch

stage.addEventListener('touchstart', function () { touchActive = true; }, { passive: true });
stage.addEventListener('touchend', function () {
  touchActive = false;
  // If a crossing was detected while the finger was still down, fire
  // the snap now that the touch has actually ended - this is what
  // stops the "glitch when you hold your finger through the trigger
  // point": we never fight the browser's own touch-scroll for control
  // while a touch is still active.
  if (pendingSnapDirection && !autoSnapping) {
    performSnap(pendingSnapDirection);
    pendingSnapDirection = null;
  }
}, { passive: true });

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function stageHeight() { return stage.clientHeight; }
function navHeight() { return siteNav.offsetHeight; }
function stageTop() { return stage.getBoundingClientRect().top; }

function restBottomY() { return stageTop() + stageHeight() - 48 - navHeight(); }
function restTopY() { return stageTop() + 16; }

function demeTriggerY() {
  if (!demeWord) {
    console.warn('DEME nav system: .hero__title span not found, using 50% fallback');
    return stageHeight() * 0.5;
  }
  const r = demeWord.getBoundingClientRect();
  const stageR = stage.getBoundingClientRect();
  return (r.top - stageR.top + stage.scrollTop) + (r.height / 2);
}

function setNavPosition(y) {
  if (!Number.isFinite(y)) {
    console.warn('DEME nav system: computed an invalid position, skipping this frame');
    return;
  }
  siteNav.style.transform = 'translate(-50%, ' + y + 'px)';
}

// Uses scrollIntoView on the real target element rather than a
// precomputed pixel offset. This matters specifically on mobile Safari:
// its address bar can show/hide DURING a scroll gesture, changing the
// real viewport height mid-motion. A pixel target computed a moment
// earlier can go stale by the time the scroll finishes, landing short
// and leaving a gap. Letting the browser resolve the target position
// at the moment it actually scrolls avoids that entirely.
function performSnap(direction) {
  autoSnapping = true;
  const target = direction === 'down'
    ? document.getElementById('content-wrap')
    : document.getElementById('home');
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(function () { autoSnapping = false; }, 600);
}

function render() {
  try {
    const h = stageHeight();
    if (!h) return;

    const st = stage.scrollTop;
    const f = clamp(st / h, 0, 1);
    const triggerY = demeTriggerY();
    const inContent = st >= triggerY;

    setNavPosition(lerp(restBottomY(), restTopY(), f));
    siteNav.classList.toggle('nav--docked', inContent);
    setActiveNav(inContent);
    logoCorner.classList.toggle('is-hidden', inContent);
    menuCorner.classList.toggle('is-hidden', inContent);
    toTopBtn.classList.toggle('visible', inContent);

    if (!autoSnapping) {
      const crossedDown = lastScrollTop < triggerY && st >= triggerY;
      const crossedUp = lastScrollTop > triggerY && st <= triggerY;
      if (crossedDown || crossedUp) {
        const direction = crossedDown ? 'down' : 'up';
        if (touchActive) {
          // Finger is still down - don't fight native touch-scroll.
          // Remember it and fire once the touch actually ends.
          pendingSnapDirection = direction;
        } else {
          performSnap(direction);
        }
      }
    }

    lastScrollTop = st;
  } catch (err) {
    console.error('DEME nav system error:', err);
  }
}

stage.addEventListener('scroll', render, { passive: true });
window.addEventListener('resize', render);
window.addEventListener('load', render);
render();