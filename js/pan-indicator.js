/**
 * Sync the horizontal pan indicator with the viewport scrollLeft.
 * Active only when stage-scale sets data-mode="pan-x" on .viewport.
 */
(function () {
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function thumbWidthPx(vp, trackW) {
    var scrollW = vp.scrollWidth;
    var clientW = vp.clientWidth;
    var max = Math.max(0, scrollW - clientW);
    var minThumb = 34;
    var w = max > 0 ? (clientW / scrollW) * trackW : trackW;
    return clamp(w, minThumb, trackW);
  }

  var raf = 0;
  var pendingX = null;

  function schedule(clientX) {
    pendingX = clientX;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      if (pendingX == null) return;
      setScrollFromClientX(pendingX);
      pendingX = null;
      sync();
    });
  }

  function setScrollFromClientX(clientX) {
    var vp = document.querySelector(".viewport");
    var bar = document.getElementById("pan-indicator");
    if (!vp || !bar) return;
    if (!(vp.dataset && vp.dataset.mode === "pan-x")) return;

    var track = bar.querySelector(".pan-indicator__track");
    if (!track) return;

    var r = track.getBoundingClientRect();
    var trackW = r.width || 1;
    var w = thumbWidthPx(vp, trackW);
    // Map pointer to the thumb's center so dragging feels 1:1.
    var xCenter = clamp(clientX - r.left, 0, trackW);
    var x = clamp(xCenter - w / 2, 0, Math.max(0, trackW - w));

    var max = Math.max(0, vp.scrollWidth - vp.clientWidth);
    if (max <= 0) return;

    var ratio = (trackW - w) > 0 ? x / (trackW - w) : 0;
    vp.scrollLeft = ratio * max;
  }

  function sync() {
    var vp = document.querySelector(".viewport");
    var bar = document.getElementById("pan-indicator");
    var thumb = document.getElementById("pan-indicator-thumb");
    if (!vp || !bar || !thumb) return;

    var on = vp.dataset && vp.dataset.mode === "pan-x";
    bar.classList.toggle("is-on", !!on);
    if (!on) return;

    var scrollW = vp.scrollWidth;
    var clientW = vp.clientWidth;
    var max = Math.max(0, scrollW - clientW);

    var trackW = bar.querySelector(".pan-indicator__track").clientWidth;
    var w = thumbWidthPx(vp, trackW);

    var x = max > 0 ? (vp.scrollLeft / max) * (trackW - w) : 0;
    x = clamp(x, 0, Math.max(0, trackW - w));

    thumb.style.width = w + "px";
    thumb.style.transform = "translate3d(" + x + "px, 0, 0)";
  }

  function init() {
    var vp = document.querySelector(".viewport");
    var bar = document.getElementById("pan-indicator");
    if (!vp || !bar) return;

    vp.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", function () {
      sync();
      setTimeout(sync, 50);
    });

    var dragging = false;
    var activeId = null;
    var track = bar.querySelector(".pan-indicator__track");
    if (!track) return;

    function onDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!(vp.dataset && vp.dataset.mode === "pan-x")) return;
      dragging = true;
      activeId = e.pointerId;
      try {
        track.setPointerCapture(e.pointerId);
      } catch (err) {}
      // Touch should feel 1:1, so update immediately.
      setScrollFromClientX(e.clientX);
      sync();
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging || e.pointerId !== activeId) return;
      setScrollFromClientX(e.clientX);
      sync();
      e.preventDefault();
    }

    function onUp(e) {
      if (!dragging || e.pointerId !== activeId) return;
      dragging = false;
      activeId = null;
      try {
        if (track.hasPointerCapture && track.hasPointerCapture(e.pointerId)) {
          track.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
      sync();
    }

    track.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });

    // Stage-scale runs on DOMContentLoaded; run after one frame.
    requestAnimationFrame(function () {
      sync();
      setTimeout(sync, 120);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

