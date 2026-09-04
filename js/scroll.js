/* ===================================================================
   SCROLL / STATE — landing ↔ content transitions, nav docking,
   panel switching, hamburger menu, contact form.
   =================================================================== */

// ---- Elements ----
const siteNav = document.getElementById('site-nav');
const stageTrack = document.getElementById('vertical-track');
const panelsTrack = document.getElementById('panels');
const menuToggle = document.getElementById('menu-toggle');
const menuDrawer = document.getElementById('menu-drawer');
const ctaBtn = document.getElementById('cta-btn');
const menuCorner = document.getElementById('menu-corner');
const logoCorner = document.getElementById('logo-corner');

// ---- State ----
const panelOrder = ['about', 'gallery', 'contact'];
let currentView = 'landing';   // 'landing' | 'content'
let currentPanel = 0;
let transitioning = false;
let pullAccumulator = 0;
const PULL_THRESHOLD = 150;

// ---- Active nav highlighting ----
function setActiveNav() {
  document.querySelectorAll('[data-nav-target]').forEach(function (link) {
    const isActive = currentView === 'content' && link.dataset.navTarget === panelOrder[currentPanel];
    link.classList.toggle('is-active', isActive);
  });
}

// ---- Nav slide animation - the new piece. Nav is handed over to a
// stable top:0 anchor so its position can be driven purely by an
// animated transform, sliding continuously between its bottom-dock
// and top-dock spots (matching the "moves as one unit" motion) rather
// than the old fade-out/instant-jump/fade-in swap. Nothing about the
// wheel/touch/keyboard trigger system below this changes at all. ----
siteNav.style.top = '0px';
siteNav.style.bottom = 'auto';

function navBottomRestY() { return window.innerHeight - 48 - siteNav.offsetHeight; }
function navTopRestY() { return 16; }

siteNav.style.transform = 'translate(-50%, ' + navBottomRestY() + 'px)';

function animateNavTo(targetY, duration) {
  const match = /translate\(-50%,\s*(-?\d+(?:\.\d+)?)px\)/.exec(siteNav.style.transform);
  const fromY = match ? parseFloat(match[1]) : navBottomRestY();
  const startTime = performance.now();

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    siteNav.style.transform = 'translate(-50%, ' + (fromY + (targetY - fromY) * eased) + 'px)';
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---- Stage / panel transitions ----
function updateStage() {
  transitioning = true;

  logoCorner.classList.toggle('is-hidden', currentView === 'content');
  menuCorner.classList.toggle('is-hidden', currentView === 'content');
  closeMenu();

  stageTrack.classList.toggle('show-content', currentView === 'content');
  panelsTrack.style.transform = 'translateX(-' + (currentPanel * 100) + 'vw)';
  siteNav.classList.toggle('nav--docked', currentView === 'content');
  setActiveNav();
  animateNavTo(currentView === 'content' ? navTopRestY() : navBottomRestY(), 750);

  setTimeout(function () { transitioning = false; }, 750);
}


function goToPanel(panelName) {
  const idx = panelOrder.indexOf(panelName);
  if (idx === -1) return;
  currentPanel = idx;
  currentView = 'content';
  updateStage();
}

function goToLanding() {
  currentView = 'landing';
  updateStage();
}

// ---- Wheel scroll ----
window.addEventListener('wheel', function (e) {
  e.preventDefault();
  if (transitioning) return;

  if (currentView === 'landing' && e.deltaY > 30) {
    goToPanel(panelOrder[currentPanel]);
    return;
  }

  if (currentView === 'content' && e.deltaY < 0) {
    const activePanel = document.querySelectorAll('.panel')[currentPanel];

    if (activePanel.scrollTop <= 0) {
      pullAccumulator += -e.deltaY;
      if (pullAccumulator >= PULL_THRESHOLD) {
        pullAccumulator = 0;
        goToLanding();
      }
    } else {
      pullAccumulator = 0;
    }
  } else {
    pullAccumulator = 0;
  }
}, { passive: false });

// ---- Arrow keys ----
document.addEventListener('keydown', function (e) {
  if (transitioning) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (currentView === 'landing') {
      goToPanel(panelOrder[currentPanel]);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (currentView === 'content') {
      const activePanel = document.querySelectorAll('.panel')[currentPanel];
      if (activePanel.scrollTop <= 0) {
        goToLanding();
      }
    }
  }
}, { passive: false });

// ---- Touch gestures (phones have no wheel event) ----
let touchStartY = null;

document.addEventListener('touchstart', function (e) {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', function (e) {
  if (currentView === 'landing') {
    e.preventDefault();
    return;
  }

  const activePanel = document.querySelectorAll('.panel')[currentPanel];
  const currentY = e.touches[0].clientY;
  const movingDown = currentY > touchStartY;

  if (activePanel.scrollTop <= 0 && movingDown) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchend', function (e) {
  if (touchStartY === null || transitioning) return;

  const touchEndY = e.changedTouches[0].clientY;
  const diff = touchStartY - touchEndY;
  touchStartY = null;

  const SWIPE_THRESHOLD = 60;

  if (currentView === 'landing' && diff > SWIPE_THRESHOLD) {
    goToPanel(panelOrder[currentPanel]);
  } else if (currentView === 'content' && diff < -SWIPE_THRESHOLD) {
    const activePanel = document.querySelectorAll('.panel')[currentPanel];
    if (activePanel.scrollTop <= 0) {
      goToLanding();
    }
  }
}, { passive: true });

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