/**
 * Countdown to a fixed instant in UTC: 11 June 2026, 20:00:00 UTC.
 *
 * Resilient init: retries if #countdown is missing, refreshes on tab focus /
 * bfcache restore so users are not stuck on 00:00:00:00 without a hard reload.
 */
(function () {
  var TARGET_MS = Date.UTC(2026, 5, 11, 20, 0, 0);
  var TARGET = new Date(TARGET_MS);

  var intervalId = null;
  var retryCount = 0;
  var MAX_RETRIES = 120;

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function update() {
    var root = document.getElementById("countdown");
    if (!root) {
      return false;
    }

    if (!isFinite(TARGET.getTime())) {
      return false;
    }

    var now = Date.now();
    var diff = TARGET.getTime() - now;

    var days = 0;
    var hours = 0;
    var mins = 0;
    var secs = 0;

    if (diff > 0) {
      var s = Math.floor(diff / 1000);
      days = Math.floor(s / 86400);
      hours = Math.floor((s % 86400) / 3600);
      mins = Math.floor((s % 3600) / 60);
      secs = s % 60;
    }

    var els = root.querySelectorAll(".top-bar__num[data-cd]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-cd");
      var val = 0;
      if (key === "days") val = days;
      else if (key === "hours") val = hours;
      else if (key === "mins") val = mins;
      else if (key === "secs") val = secs;
      els[i].textContent = key === "days" ? String(val) : pad(val);
    }
    return true;
  }

  function clearTimer() {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function startTimer() {
    clearTimer();
    update();
    intervalId = setInterval(update, 1000);
  }

  function tryStart() {
    if (document.getElementById("countdown")) {
      startTimer();
      return;
    }
    retryCount += 1;
    if (retryCount < MAX_RETRIES) {
      setTimeout(tryStart, 50);
    }
  }

  function boot() {
    retryCount = 0;
    tryStart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("pageshow", function (e) {
    update();
    if (e.persisted) {
      startTimer();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      update();
    }
  });
})();
