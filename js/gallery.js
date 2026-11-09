/* ===================================================================
   GALLERY - before/after
   Laptops / larger screens: drag the paintbrush handle across the photo.
   Phones (<= 768px): iOS-style Before | After switch under each photo,
   tapping the photo itself also flips it.
   =================================================================== */

(function () {
  const phoneQuery = window.matchMedia('(max-width: 768px)');
  const isPhone = function () { return phoneQuery.matches; };

  document.querySelectorAll('.gallery__card').forEach(function (card) {
    const slider = card.querySelector('[data-slider]');
    const afterImg = slider.querySelector('.gallery__after');
    const handle = slider.querySelector('.gallery__handle');
    const labelBefore = slider.querySelector('.gallery__label--before');
    const labelAfter = slider.querySelector('.gallery__label--after');
    const buttons = card.querySelectorAll('.gallery__toggle button');
    let dragging = false;
    let percent = 50;

    // ---------------- Desktop: paintbrush drag slider ----------------

    function setPosition(p) {
      percent = Math.max(0, Math.min(100, p));
      afterImg.style.clipPath = 'inset(0 0 0 ' + percent + '%)';
      handle.style.left = percent + '%';
      // Hide a label once its side of the photo is mostly covered
      labelBefore.style.opacity = percent < 18 ? '0' : '';
      labelAfter.style.opacity = percent > 82 ? '0' : '';
      slider.setAttribute('aria-valuenow', String(Math.round(percent)));
    }

    function positionFromPointer(clientX) {
      const rect = slider.getBoundingClientRect();
      setPosition(((clientX - rect.left) / rect.width) * 100);
    }

    slider.addEventListener('pointerdown', function (e) {
      if (isPhone()) return;
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      positionFromPointer(e.clientX);
    });

    slider.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      positionFromPointer(e.clientX);
    });

    function stopDrag() { dragging = false; }
    slider.addEventListener('pointerup', stopDrag);
    slider.addEventListener('pointercancel', stopDrag);

    // Keyboard: arrow keys nudge the slider
    slider.addEventListener('keydown', function (e) {
      if (isPhone()) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setState(card.classList.contains('is-after') ? 'before' : 'after');
        }
        return;
      }
      const step = e.shiftKey ? 25 : 5;
      if (e.key === 'ArrowLeft') { e.preventDefault(); setPosition(percent - step); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setPosition(percent + step); }
      if (e.key === 'Home') { e.preventDefault(); setPosition(0); }
      if (e.key === 'End') { e.preventDefault(); setPosition(100); }
    });

    // ---------------- Phones: Before | After switch ----------------

    function setState(state) {
      const after = state === 'after';
      card.classList.toggle('is-after', after);
      slider.dataset.state = state;
      buttons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.show === state));
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { setState(btn.dataset.show); });
    });

    slider.addEventListener('click', function () {
      if (!isPhone()) return;
      setState(card.classList.contains('is-after') ? 'before' : 'after');
    });

    // ---------------- Mode switching (rotate / resize) ----------------

    function applyMode() {
      if (isPhone()) {
        slider.removeAttribute('role');
        slider.removeAttribute('aria-valuemin');
        slider.removeAttribute('aria-valuemax');
        slider.removeAttribute('aria-valuenow');
        slider.setAttribute('tabindex', '-1');   // the switch buttons take focus instead
        labelBefore.style.opacity = '';
        labelAfter.style.opacity = '';
        afterImg.style.clipPath = '';
        handle.style.left = '';
        setState(slider.dataset.state || 'before');
      } else {
        slider.setAttribute('role', 'slider');
        slider.setAttribute('tabindex', '0');
        slider.setAttribute('aria-label', 'Before and after comparison - use left and right arrows');
        slider.setAttribute('aria-valuemin', '0');
        slider.setAttribute('aria-valuemax', '100');
        card.classList.remove('is-after');
        setPosition(percent);
      }
    }

    applyMode();
    phoneQuery.addEventListener('change', applyMode);
  });
})();
