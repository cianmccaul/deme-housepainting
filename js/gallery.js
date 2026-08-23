/* ===================================================================
   GALLERY — before/after drag slider
   =================================================================== */

document.querySelectorAll('[data-slider]').forEach(function (slider) {
  const afterImg = slider.querySelector('.gallery__after');
  const handle = slider.querySelector('.gallery__handle');
  let dragging = false;

  function setPosition(clientX) {
    const rect = slider.getBoundingClientRect();
    let percent = ((clientX - rect.left) / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));

    afterImg.style.clipPath = 'inset(0 0 0 ' + percent + '%)';
    handle.style.left = percent + '%';
  }

  slider.addEventListener('pointerdown', function (e) {
    dragging = true;
    slider.setPointerCapture(e.pointerId);
    setPosition(e.clientX);
  });

  slider.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    setPosition(e.clientX);
  });

  slider.addEventListener('pointerup', function () {
    dragging = false;
  });
});