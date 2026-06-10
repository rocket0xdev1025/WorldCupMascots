/**
 * Draggable ball with lightweight physics (gravity + bounce) in viewport space.
 * - Drops in on load from above the header.
 * - Click the ball to jump.
 * - Drag & release: continues falling, bounces on the ground, settles.
 */
(function () {
  var ball;
  var inner;
  var dragging = false;
  var dragMoved = false;
  var startBall = { left: 0, top: 0 };
  var activePointerId = null;
  var suppressClickUntil = 0;
  var downX = 0;
  var downY = 0;

  var pos = { x: 0, y: -240 };
  var vel = { x: 0, y: 0 };
  var lastMove = { t: 0, x: 0, y: 0 };
  var raf = 0;
  var simRunning = false;
  var idleTimer = 0;
  var userActiveUntil = 0;

  var GRAVITY = 3200; // px/s^2
  var RESTITUTION = 0.52;
  var WALL_RESTITUTION = 0.28;
  var AIR_DAMPING = 0.995;
  var FLOOR_FRICTION = 0.86;
  var SLEEP_VY = 60;
  var SLEEP_VX = 22;

  function reduceMotion() {
    return (
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function readPxVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      var n = parseFloat(String(v || "").replace("px", ""));
      return isFinite(n) ? n : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function dims() {
    return { w: ball.offsetWidth || 120, h: ball.offsetHeight || 120 };
  }

  function applyPos() {
    ball.style.left = pos.x + "px";
    ball.style.top = pos.y + "px";
  }

  function bounds() {
    var headerH = readPxVar("--top-bar-h", 88);
    var footerH = readPxVar("--footer-h", 44);
    var d = dims();
    var minX = 0;
    var maxX = Math.max(0, window.innerWidth - d.w);
    var minY = headerH;
    var maxY = Math.max(minY, window.innerHeight - footerH - d.h);
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }

  function clampToViewport() {
    var b = bounds();
    pos.x = Math.max(b.minX, Math.min(b.maxX, pos.x));
    pos.y = Math.max(b.minY, Math.min(b.maxY, pos.y));
    applyPos();
  }

  function stopSim() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    simRunning = false;
  }

  function clearIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = 0;
  }

  function scheduleIdleHop() {
    clearIdle();
    if (reduceMotion()) return;
    // Slight self-bounce when idle (no user input).
    idleTimer = setTimeout(function () {
      // If user is active, skip.
      if (Date.now() < userActiveUntil) {
        scheduleIdleHop();
        return;
      }
      var b = bounds();
      if (pos.y >= b.maxY - 0.5 && vel.x === 0 && vel.y === 0 && !dragging) {
        // Random idle hop height (more variety: low/medium/high)
        var r = Math.random();
        var kick;
        if (r < 0.55) kick = 120 + Math.random() * 180; // 120..300
        else if (r < 0.9) kick = 220 + Math.random() * 220; // 220..440
        else kick = 380 + Math.random() * 220; // 380..600
        vel.y = -kick;
        startSim();
      }
      scheduleIdleHop();
    }, 1400 + Math.random() * 3200);
  }

  function startSim() {
    if (simRunning) return;
    simRunning = true;
    var lastT = performance.now();

    function step(t) {
      if (!simRunning) return;
      var dt = (t - lastT) / 1000;
      lastT = t;
      if (!isFinite(dt) || dt <= 0) dt = 0.016;
      if (dt > 0.05) dt = 0.05;

      if (!dragging) {
        vel.y += GRAVITY * dt;
        var damping = Math.pow(AIR_DAMPING, dt * 60);
        vel.x *= damping;
        vel.y *= damping;

        pos.x += vel.x * dt;
        pos.y += vel.y * dt;

        var b = bounds();
        var bounced = false;
        var anyBounce = false;

        if (pos.x < b.minX) {
          pos.x = b.minX;
          vel.x = -vel.x * WALL_RESTITUTION;
          anyBounce = true;
        } else if (pos.x > b.maxX) {
          pos.x = b.maxX;
          vel.x = -vel.x * WALL_RESTITUTION;
          anyBounce = true;
        }

        if (pos.y < b.minY) {
          pos.y = b.minY;
          // Ceiling bounce instead of sticking.
          if (vel.y < 0) vel.y = -vel.y * WALL_RESTITUTION;
          else vel.y = 0;
          anyBounce = true;
        } else if (pos.y > b.maxY) {
          pos.y = b.maxY;
          vel.y = -vel.y * RESTITUTION;
          vel.x *= FLOOR_FRICTION;
          bounced = true;
          anyBounce = true;
          if (Math.abs(vel.y) < SLEEP_VY) vel.y = 0;
          if (Math.abs(vel.x) < SLEEP_VX) vel.x = 0;
        }

        applyPos();

        if (pos.y >= b.maxY && vel.x === 0 && vel.y === 0) {
          stopSim();
          scheduleIdleHop();
          return;
        }
      }

      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
  }

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopSim();
    clearIdle();
    try {
      ball.setPointerCapture(e.pointerId);
    } catch (err) {}
    activePointerId = e.pointerId;
    dragging = true;
    dragMoved = false;
    downX = e.clientX;
    downY = e.clientY;
    ball.classList.add("is-dragging");
    startBall.left = pos.x;
    startBall.top = pos.y;
    lastMove.t = performance.now();
    lastMove.x = e.clientX;
    lastMove.y = e.clientY;
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== activePointerId) return;
    if (!dragMoved) {
      var dx0 = e.clientX - downX;
      var dy0 = e.clientY - downY;
      if (dx0 * dx0 + dy0 * dy0 >= 7 * 7) dragMoved = true;
    }
    pos.x = startBall.left + (e.clientX - lastMove.startX || 0);
    pos.y = startBall.top + (e.clientY - lastMove.startY || 0);
    // Use captured start point stored on first move
    if (!isFinite(lastMove.startX)) {
      lastMove.startX = e.clientX;
      lastMove.startY = e.clientY;
      pos.x = startBall.left;
      pos.y = startBall.top;
    } else {
      pos.x = startBall.left + (e.clientX - lastMove.startX);
      pos.y = startBall.top + (e.clientY - lastMove.startY);
    }
    clampToViewport();

    var now = performance.now();
    var ms = Math.max(1, now - lastMove.t);
    vel.x = ((e.clientX - lastMove.x) / ms) * 1000;
    vel.y = ((e.clientY - lastMove.y) / ms) * 1000;
    lastMove.t = now;
    lastMove.x = e.clientX;
    lastMove.y = e.clientY;
  }

  function onPointerUp(e) {
    if (!dragging || e.pointerId !== activePointerId) return;
    var wasTap = !dragMoved;
    suppressClickUntil = Date.now() + 350;
    dragging = false;
    activePointerId = null;
    ball.classList.remove("is-dragging");
    try {
      if (ball.hasPointerCapture && ball.hasPointerCapture(e.pointerId)) {
        ball.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    lastMove.startX = NaN;
    lastMove.startY = NaN;
    clampToViewport();
    if (wasTap) {
      jump(1250);
      return;
    }
    // Drag-release: extend user-active window so idle hops stay suppressed.
    userActiveUntil = Date.now() + 4000;
    startSim();
  }

  function shouldIgnoreClick(target) {
    if (!target || !target.closest) return true;
    if (target.closest(".top-bar")) return true;
    if (target.closest(".site-footer")) return true;
    if (target.closest(".pan-indicator")) return true;
    if (target.closest(".screen-pair")) return true;
    if (target.closest(".mascot")) return true;
    if (target.closest("a")) return true;
    if (target.closest("button")) return true;
    if (target.closest(".modal")) return true;
    return false;
  }

  function jump(strength) {
    if (dragging) return;
    if (!isFinite(strength)) strength = 1100;
    vel.y = -Math.abs(strength);
    userActiveUntil = Date.now() + 4000;
    if (!simRunning) startSim();
  }

  function onBallClick(e) {
    if (Date.now() < suppressClickUntil) return;
    e.preventDefault();
    // Click-to-bounce (same physics as drag-release, just an impulse)
    jump(1250);
  }

  function onDocumentClick(e) {
    if (Date.now() < suppressClickUntil) return;
    if (shouldIgnoreClick(e.target)) return;
    jump(950);
  }

  function onResize() {
    clampToViewport();
  }

  function init() {
    ball = document.getElementById("ball");
    if (!ball) return;
    inner = ball.querySelector(".ball__inner");
    if (!inner) return;

    var b = bounds();
    pos.x = Math.round(window.innerWidth * 0.5);
    // Start just below the header, then gravity takes over.
    pos.y = b.minY + 8;
    applyPos();

    ball.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    ball.addEventListener("click", onBallClick, true);
    document.addEventListener("click", onDocumentClick, false);

    window.addEventListener("resize", onResize);

    clampToViewport();
    startSim();
    scheduleIdleHop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
