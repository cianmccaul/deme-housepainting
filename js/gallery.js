/* ===================================================================
   GALLERY — before/after interaction
   STEP 7 (desktop) + STEP 8 (mobile)

   Desktop slider plan: one pointermove listener on the frame,
   clip the "after" image width to cursor x-position (~25 lines,
   no drag-physics library needed).

   Mobile toggle plan: simple state flip, swap which image is
   visible/on top, driven by a single button.
   =================================================================== */