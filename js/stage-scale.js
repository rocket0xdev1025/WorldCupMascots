/**
 * Scales the 3000×1687 stage into the viewport.
 * - Portrait: scale by height (pan horizontally).
 * - Landscape: "cover" — fill width and height (no side gutters). The visible
 *   content area is shorter than a full 16:9 monitor because of the fixed header
 *   and footer, so its aspect is wider than 16:9; contain scaling would always
 *   leave empty pillars — cover fixes that (may crop a sliver top/bottom).
 */
(function () {
  const STAGE_W = 3000;
  const STAGE_H = 1687;

  /** Usable inner size of .viewport (content box after CSS padding). */
  function viewportContentSize(vp) {
    if (!vp) {
      return { w: window.innerWidth, h: window.innerHeight };
    }
    try {
      var cs = window.getComputedStyle(vp);
      var pl = parseFloat(cs.paddingLeft) || 0;
      var pr = parseFloat(cs.paddingRight) || 0;
      var pt = parseFloat(cs.paddingTop) || 0;
      var pb = parseFloat(cs.paddingBottom) || 0;
      return {
        w: Math.max(0, vp.clientWidth - pl - pr),
        h: Math.max(0, vp.clientHeight - pt - pb),
      };
    } catch (e) {
      return { w: vp.clientWidth, h: vp.clientHeight };
    }
  }

  function fitStage() {
    const stage = document.getElementById("stage");
    const outer = document.getElementById("stage-outer");
    if (!stage || !outer) return;

    const vp = document.querySelector(".viewport");
    var inner = viewportContentSize(vp);
    var vw = inner.w;
    var vh = inner.h;

    const portrait = (vp ? vp.clientHeight : window.innerHeight) > (vp ? vp.clientWidth : window.innerWidth);
    var scale;
    if (portrait) {
      scale = Math.min(vh / STAGE_H, 1);
    } else {
      scale = Math.max(vw / STAGE_W, vh / STAGE_H);
    }
    stage.style.transform = "scale(" + scale + ")";
    outer.style.width = Math.round(STAGE_W * scale) + "px";
    outer.style.height = Math.round(STAGE_H * scale) + "px";

    if (vp) {
      vp.dataset.mode = portrait ? "pan-x" : "fit";
      if (portrait) {
        vp.scrollLeft = Math.max(0, (outer.offsetWidth - vp.clientWidth) / 2);
      }
    }
  }

  function removeBrokenGroundImage() {
    var z = document.querySelector(".layer-ground-img");
    if (!z) return;
    z.addEventListener("error", function () {
      this.remove();
    });
  }

  function init() {
    removeBrokenGroundImage();
    fitStage();
  }

  window.addEventListener("resize", fitStage);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
