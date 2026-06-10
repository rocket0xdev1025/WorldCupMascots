/**
 * Boot: wait for images to load before revealing the UI.
 * Uses decode() when available for best results.
 */
(function () {
  function markReady() {
    document.documentElement.classList.remove("is-loading");
  }

  function imgReady(img) {
    if (!img || !img.getAttribute) return Promise.resolve();
    var src = img.getAttribute("src");
    if (!src) return Promise.resolve();
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();

    if (img.decode) {
      return img
        .decode()
        .catch(function () {
          return new Promise(function (resolve) {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        });
    }

    return new Promise(function (resolve) {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }

  function boot() {
    var imgs = Array.prototype.slice.call(document.images || []);

    // Ignore cross-origin iframes; only images.
    var promises = [];
    for (var i = 0; i < imgs.length; i++) {
      promises.push(imgReady(imgs[i]));
    }

    Promise.allSettled(promises).then(function () {
      // One frame to avoid layout jank on reveal.
      requestAnimationFrame(function () {
        markReady();
      });
    });

    // Safety timeout: never block forever.
    setTimeout(function () {
      markReady();
    }, 6000);
  }

  document.documentElement.classList.add("is-loading");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

