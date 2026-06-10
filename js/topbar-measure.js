/**
 * Measures the fixed top bar height and writes it to --top-bar-h.
 * Prevents clipping in portrait when content wraps.
 */
(function () {
  function setVar(px) {
    document.documentElement.style.setProperty("--top-bar-h", Math.round(px) + "px");
  }

  function init() {
    var bar = document.querySelector(".top-bar");
    if (!bar) return;

    function update() {
      var r = bar.getBoundingClientRect();
      if (r && r.height) setVar(r.height);
    }

    update();

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        update();
      });
      ro.observe(bar);
    } else {
      window.addEventListener("resize", update);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

