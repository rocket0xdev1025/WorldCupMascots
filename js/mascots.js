/**
 * Mascot behavior:
 * - Normal image sits above the front layer.
 * - Hover image shows below the front layer.
 */
(function () {
  function setHover(id, on) {
    var el = document.querySelector(".mascot-hover--" + id);
    if (!el) return;
    if (on) el.classList.add("is-on");
    else el.classList.remove("is-on");
  }

  function wire() {
    var hits = document.querySelectorAll(".mascot-hit[data-mascot]");
    var activeId = null;
    var canHover =
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function clearActive() {
      if (!activeId) return;
      setHover(activeId, false);
      var prev = document.querySelector('.mascot-hit[data-mascot="' + activeId + '"]');
      if (prev) prev.classList.remove("is-active");
      activeId = null;
    }

    document.addEventListener(
      "pointerdown",
      function (e) {
        var hit = e.target && e.target.closest ? e.target.closest(".mascot-hit[data-mascot]") : null;
        if (hit) return;
        clearActive();
      },
      true
    );

    for (var i = 0; i < hits.length; i++) {
      (function () {
        var hit = hits[i];
        var id = hit.getAttribute("data-mascot");
        if (!id) return;

        if (canHover) {
          function onEnter() {
            setHover(id, true);
          }
          function onLeave() {
            setHover(id, false);
          }
          hit.addEventListener("pointerenter", onEnter);
          hit.addEventListener("pointerleave", onLeave);
          hit.addEventListener("focus", onEnter);
          hit.addEventListener("blur", onLeave);
        }

        // Mobile / touch: tap toggles hover, persists until tapping elsewhere.
        hit.addEventListener(
          "pointerdown",
          function (e) {
            if (canHover) return;
            if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
            e.preventDefault();
            e.stopPropagation();
            if (activeId && activeId !== id) {
              clearActive();
            }
            if (activeId === id) {
              clearActive();
            } else {
              activeId = id;
              hit.classList.add("is-active");
              setHover(id, true);
            }
          },
          { passive: false }
        );
      })();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();

