
Scroll · JS
/* ===================================================================
   SCROLL / STATE - real native free scroll, nav tracks scroll
   position continuously and auto-completes once "DEME" is scrolled
   half out of view. Panel switching (About/Gallery/Contact) still
   slides horizontally, unchanged from before. Hamburger menu and
   contact form also unchanged.
   =================================================================== */
 
// ---- Elements ----
const stage = document.getElementById('stage');
const siteNav = document.getElementById('site-nav');
const panelsTrack = document.getElementById('panels');
const menuToggle = document.getElementById('menu-toggle');
const menuDrawer = document.getElementById('menu-drawer');
const ctaBtn = document.getElementById('cta-btn');
const menuCorner = document.getElementById('menu-corner');
const logoCorner = document.getElementById('logo-corner');
const demeWord = document.querySelector('.hero__title span');
 
// ---- State ----
const panelOrder = ['about', 'gallery', 'contact'];
let currentPanel = 0;
let lastScrollTop = 0;
let autoSnapping = false;
 
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
 
function stageHeight() { return stage.clientHeight; }
function navHeight() { return siteNav.offsetHeight; }
function stageTop() { return stage.getBoundingClientRect().top; }
 
// Nav's two resting positions, measured from the top of the viewport.
function restBottomY() { return stageTop() + stageHeight() - 48 - navHeight(); }
function restTopY() { return stageTop() + 16; }
 
// The scrollTop value at which "DEME" is scrolled exactly half out of
// view - this, not a generic scroll fraction, is what triggers the
// auto-complete snap.
function demeTriggerY() {
  const r = demeWord.getBoundingClientRect();
  const stageR = stage.getBoundingClientRect();
  return (r.top - stageR.top + stage.scrollTop) + (r.height / 2);
}
 
function setNavPosition(y) {
  siteNav.style.transform = 'translate(-50%, ' + y + 'px)';
}
 
function setActiveNav(inContent) {
  document.querySelectorAll('[data-nav-target]').forEach(function (link) {
    const isActive = inContent && link.dataset.navTarget === panelOrder[currentPanel];
    link.classList.toggle('is-active', isActive);
  });
}
 
// ---- The single source of truth: runs on every real scroll tick ----
function render() {
  const st = stage.scrollTop;
  const f = clamp(st / stageHeight(), 0, 1);
  const inContent = st >= demeTriggerY();
 
  setNavPosition(lerp(restBottomY(), restTopY(), f));
  siteNav.classList.toggle('nav--docked', inContent);
  setActiveNav(inContent);
  logoCorner.classList.toggle('is-hidden', inContent);
  menuCorner.classList.toggle('is-hidden', inContent);
 
  if (!autoSnapping) {
    const triggerY = demeTriggerY();
    const crossedDown = lastScrollTop < triggerY && st >= triggerY;
    const crossedUp = lastScrollTop > triggerY && st <= triggerY;
    if (crossedDown || crossedUp) {
      autoSnapping = true;
      stage.scrollTo({ top: crossedDown ? stageHeight() : 0, behavior: 'smooth' });
      setTimeout(function () { autoSnapping = false; }, 600);
    }
  }
 
  lastScrollTop = st;
}
 
stage.addEventListener('scroll', render, { passive: true });
window.addEventListener('resize', render);
window.addEventListener('load', render);
render();
 
// ---- Panel switching (About / Gallery / Contact slide horizontally) ----
function goToPanel(panelName) {
  const idx = panelOrder.indexOf(panelName);
  if (idx === -1) return;
  currentPanel = idx;
  panelsTrack.style.transform = 'translateX(-' + (idx * 100) + 'vw)';
 
  // If not already scrolled into content, scroll down first.
  if (stage.scrollTop < demeTriggerY()) {
    stage.scrollTo({ top: stageHeight(), behavior: 'smooth' });
  }
  setActiveNav(true);
}
 
function goToLanding() {
  stage.scrollTo({ top: 0, behavior: 'smooth' });
}
 
// ---- Nav links (site-nav tabs AND menu-drawer links, both at once) ----
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
 
// ---- Hamburger menu ----
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
 
// ---- Landing CTA button ----
ctaBtn.addEventListener('click', function () {
  this.classList.toggle('is-selected');
});
 
// ---- Contact form: auto-growing textarea ----
const detailsField = document.getElementById('details');
detailsField.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});
 
// ---- Contact form submission ----
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
 
    if (!response.ok) {
      throw new Error('Request failed');
    }
 
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
 
