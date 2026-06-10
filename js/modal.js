/**
 * Minimal modal controller (open/close + ESC + backdrop).
 */
(function () {
  function stopEmbeddedMedia(modalEl) {
    if (!modalEl || !modalEl.querySelectorAll) return;
    var iframes = modalEl.querySelectorAll("iframe");
    for (var i = 0; i < iframes.length; i++) {
      var f = iframes[i];
      if (!f) continue;
      var src = f.getAttribute("src") || "";
      if (!src) continue;
      // Cache original src once, then blank it to stop playback.
      if (!f.getAttribute("data-src")) f.setAttribute("data-src", src);
      f.setAttribute("src", "about:blank");
    }
  }

  function resumeEmbeddedMedia(modalEl) {
    if (!modalEl || !modalEl.querySelectorAll) return;
    var iframes = modalEl.querySelectorAll("iframe");
    for (var i = 0; i < iframes.length; i++) {
      var f = iframes[i];
      if (!f) continue;
      var cached = f.getAttribute("data-src") || "";
      if (!cached) continue;
      // Restore original src on open.
      f.setAttribute("src", cached);
    }
  }

  function openModal(id) {
    var m = document.getElementById("modal-" + id);
    if (!m) return;
    resumeEmbeddedMedia(m);
    m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var closeBtn = m.querySelector("[data-modal-close]");
    if (closeBtn && closeBtn.focus) closeBtn.focus();
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.setAttribute("aria-hidden", "true");
    stopEmbeddedMedia(modalEl);
    document.body.style.overflow = "";
  }

  function onClick(e) {
    var open = e.target && e.target.closest ? e.target.closest("[data-modal-open]") : null;
    if (open) {
      var id = open.getAttribute("data-modal-open");
      if (id) openModal(id);
      return;
    }

    var close = e.target && e.target.closest ? e.target.closest("[data-modal-close]") : null;
    if (close) {
      var modal = close.closest(".modal");
      closeModal(modal);
    }
  }

  function onKeyDown(e) {
    if (e.key !== "Escape") return;
    var m = document.querySelector(".modal[aria-hidden=\"false\"]");
    if (m) closeModal(m);
  }

  document.addEventListener("click", onClick, false);
  document.addEventListener("keydown", onKeyDown, false);
})();

