/*
 * Home-page intro: the header sigil (Alchemist's A) fills the screen, spins while a spectral
 * green glow builds, then bursts into sparks. While it plays, body gets
 * .intro-playing, which pauses the hero's photo/name fade-in (styles.css) so
 * that animation starts as the sparks fall.
 *
 * Loaded synchronously as the first child of <body> so the overlay is up
 * before anything paints. Click or any key skips it; reduced-motion users
 * never see it.
 */
(function () {
    "use strict";

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var SPIN_MS = 1700;      // spin + glow build-up before the burst
    var FADE_MS = 600;       // overlay background fade after the burst
    var SPARK_MS = 1000;     // spark lifetime

    var body = document.body;
    body.classList.add("intro-playing");

    var overlay = document.createElement("div");
    overlay.id = "occult-intro";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
        '<svg class="intro-sigil" viewBox="0 0 40 40" fill="none" stroke="currentColor">' +
        '<g class="intro-spin">' +
        '<g class="intro-ring-outer">' +
        '<circle cx="20" cy="20" r="17" stroke-width="0.5"/>' +
        '<path d="M17 34.5h6" stroke-width="0.45"/>' +
        '</g>' +
        '<circle class="intro-ring-inner" cx="20" cy="20" r="14.5" stroke-width="0.3" stroke-dasharray="1.2 2.2"/>' +
        '<g class="intro-core">' +
        '<path d="M12.5 30.5 20 8.5 27.5 30.5" stroke-width="0.7" stroke-linejoin="miter"/>' +
        '<path d="M9 24h22" stroke-width="0.5"/>' +
        '<path d="M8 24l1.2-1.2 1.2 1.2-1.2 1.2zM29.6 24l1.2-1.2 1.2 1.2-1.2 1.2z" fill="currentColor" stroke="none"/>' +
        '<circle cx="20" cy="5.6" r="1.1" fill="currentColor" stroke="none"/>' +
        '</g>' +
        '</g>' +
        '</svg>' +
        '<canvas class="intro-sparks"></canvas>';
    body.insertBefore(overlay, body.firstChild);

    var canvas = overlay.querySelector(".intro-sparks");
    var sigil = overlay.querySelector(".intro-sigil");
    var timers = [];
    var rafId = 0;
    var finished = false;

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function releaseHero() {
        body.classList.remove("intro-playing");
    }

    function teardown() {
        if (finished) return;
        finished = true;
        timers.forEach(clearTimeout);
        cancelAnimationFrame(rafId);
        releaseHero();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        window.removeEventListener("keydown", skip);
        overlay.removeEventListener("click", skip);
    }

    function skip() {
        overlay.classList.add("is-fading");
        releaseHero();
        later(teardown, 300);
    }

    window.addEventListener("keydown", skip);
    overlay.addEventListener("click", skip);

    function burst() {
        overlay.classList.add("is-burst");
        sparks();
        later(function () {
            overlay.classList.add("is-fading");
            releaseHero();
        }, 180);
        later(teardown, Math.max(FADE_MS, SPARK_MS) + 250);
    }

    function sparks() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = window.innerWidth, h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        var ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        var rect = sigil.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var radius = rect.width * 0.41;   // the sigil's outer ring
        var speedScale = Math.min(w, h) / 900;

        var count = w < 640 ? 140 : 240;
        var parts = [];
        for (var i = 0; i < count; i++) {
            var a = Math.random() * Math.PI * 2;
            // Most sparks leave from the ring; a few from the core
            var r = Math.random() < 0.8 ? radius * (0.9 + Math.random() * 0.2) : Math.random() * radius * 0.4;
            var v = (4 + Math.random() * 10) * speedScale;
            parts.push({
                x: cx + Math.cos(a) * r,
                y: cy + Math.sin(a) * r,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v - 1.5 * speedScale,
                life: 0.55 + Math.random() * 0.45,
                size: 0.8 + Math.random() * 1.8,
                hue: 118 + Math.random() * 30,
                light: 55 + Math.random() * 25
            });
        }

        var start = performance.now();
        var last = start;
        function frame(now) {
            var dt = Math.min((now - last) / 16.67, 3);
            last = now;
            var t = (now - start) / SPARK_MS;
            ctx.clearRect(0, 0, w, h);
            ctx.globalCompositeOperation = "lighter";
            var alive = false;
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                var age = t / p.life;
                if (age >= 1) continue;
                alive = true;
                var px = p.x, py = p.y;
                p.vx *= Math.pow(0.94, dt);
                p.vy = p.vy * Math.pow(0.94, dt) + 0.22 * speedScale * dt;  // embers drift down
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                var alpha = (1 - age) * (1 - age);
                ctx.strokeStyle = "hsla(" + p.hue + ",100%," + p.light + "%," + alpha + ")";
                ctx.lineWidth = p.size * (1 - age * 0.6);
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(px - p.vx * 1.5, py - p.vy * 1.5);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
            if (alive && !finished) rafId = requestAnimationFrame(frame);
        }
        rafId = requestAnimationFrame(frame);
    }

    later(burst, SPIN_MS);
    // Failsafe: never leave the page covered
    later(teardown, SPIN_MS + 4000);
})();
