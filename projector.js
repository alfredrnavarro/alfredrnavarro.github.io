/*
 * News page "Now Showing" projector (markup in news.html, styles in
 * projector.css). The project list lives in the filmstrip's first set of
 * frames as data-* attributes, so the content is static HTML; this file
 * only cycles the screen, draws the light beam from the lens to the screen,
 * and pauses everything on hover/focus, offscreen, or in a hidden tab.
 */
(function () {
    "use strict";

    var INTERVAL = 5200;
    var CUT_SWAP_AT = 190; // ms into the roll animation when the image swaps

    function init() {
        var stage = document.getElementById("np-stage");
        if (!stage) return;

        var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var sets = stage.querySelectorAll(".np-set");
        var projects = Array.prototype.slice.call(sets[0].querySelectorAll(".np-frame"));
        var allFrames = Array.prototype.slice.call(stage.querySelectorAll(".np-frame"));
        if (!projects.length) return;

        var screen = stage.querySelector(".np-screen");
        var film = stage.querySelector(".np-film");
        var titleEl = stage.querySelector(".np-title");
        var blurbEl = stage.querySelector(".np-blurb");
        var reelEl = stage.querySelector(".np-reel-count");
        var viewEl = stage.querySelector(".np-view");
        var lens = stage.querySelector(".np-lens-point");
        var beamShapes = Array.prototype.slice.call(stage.querySelectorAll(".np-beam-shape"));
        var motes = stage.querySelector(".np-motes");
        var beamSvg = stage.querySelector(".np-beam");

        var current = 0;
        var timer = 0;
        var cutTimer = 0;

        function pad(n) { return n < 10 ? "0" + n : String(n); }

        function apply(i) {
            var d = projects[i].dataset;
            film.src = d.src;
            film.width = +d.w;
            film.height = +d.h;
            film.alt = d.title;
            film.classList.toggle("is-contain", d.fit === "contain");
            screen.style.background = d.bg || "";
        }

        function show(i, animate) {
            current = (i + projects.length) % projects.length;
            var d = projects[current].dataset;

            titleEl.textContent = d.title;
            blurbEl.textContent = d.blurb;
            reelEl.textContent = "Reel " + pad(current + 1) + " / " + pad(projects.length);
            screen.href = d.href;
            viewEl.href = d.href;
            screen.setAttribute("aria-label", "Open " + d.title);

            allFrames.forEach(function (f) {
                f.classList.toggle("is-active", +f.dataset.index === current);
            });

            clearTimeout(cutTimer);
            if (animate && !reduced) {
                screen.classList.remove("is-cutting");
                void screen.offsetWidth; // restart the animation
                screen.classList.add("is-cutting");
                var target = current;
                cutTimer = setTimeout(function () { apply(target); }, CUT_SWAP_AT);
            } else {
                apply(current);
            }
        }

        screen.addEventListener("animationend", function () {
            screen.classList.remove("is-cutting");
        });

        // ---- Autoplay + pause state ----
        var hovering = false;
        var focused = false;
        var inView = true;

        function playing() {
            return !reduced && !hovering && !focused && inView && !document.hidden;
        }

        function schedule() {
            clearInterval(timer);
            var on = playing();
            stage.classList.toggle("is-paused", !on);
            if (on) timer = setInterval(function () { show(current + 1, true); }, INTERVAL);
        }

        stage.addEventListener("pointerenter", function () { hovering = true; schedule(); });
        stage.addEventListener("pointerleave", function () { hovering = false; schedule(); });
        stage.addEventListener("focusin", function () { focused = true; schedule(); });
        stage.addEventListener("focusout", function (e) {
            if (!stage.contains(e.relatedTarget)) { focused = false; schedule(); }
        });
        document.addEventListener("visibilitychange", schedule);

        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entries) {
                inView = entries[0].isIntersecting;
                schedule();
            }, { threshold: 0.05 }).observe(stage);
        }

        // ---- Controls ----
        stage.querySelector(".np-prev").addEventListener("click", function () { show(current - 1, true); });
        stage.querySelector(".np-next").addEventListener("click", function () { show(current + 1, true); });
        allFrames.forEach(function (f) {
            f.addEventListener("click", function () {
                if (+f.dataset.index !== current) show(+f.dataset.index, true);
            });
        });

        // ---- Dust motes: scattered over the beam's bounding box; the
        // beam polygon clips them, so only the ones in the light show ----
        var SVG_NS = "http://www.w3.org/2000/svg";
        var MOTE_COUNT = 22;
        var moteBox = "";

        function scatterMotes(x0, y0, x1, y1) {
            var key = [x0, y0, x1, y1].map(Math.round).join(",");
            if (!motes || key === moteBox) return;
            moteBox = key;
            while (motes.firstChild) motes.removeChild(motes.firstChild);
            for (var i = 0; i < MOTE_COUNT; i++) {
                var c = document.createElementNS(SVG_NS, "circle");
                c.setAttribute("class", "np-mote");
                c.setAttribute("cx", (x0 + Math.random() * (x1 - x0)).toFixed(1));
                c.setAttribute("cy", (y0 + Math.random() * (y1 - y0)).toFixed(1));
                c.setAttribute("r", (0.6 + Math.random() * 1.3).toFixed(2));
                c.setAttribute("style",
                    "--d:" + (4 + Math.random() * 6).toFixed(1) + "s;" +
                    "--delay:" + (-Math.random() * 8).toFixed(1) + "s;" +
                    "--dx:" + (Math.random() * 30 - 10).toFixed(0) + "px;" +
                    "--dy:" + (Math.random() * 24 - 12).toFixed(0) + "px");
                motes.appendChild(c);
            }
        }

        // ---- Beam: lens point -> screen's left edge ----
        function drawBeam() {
            if (!beamShapes.length || getComputedStyle(beamSvg).display === "none") return;
            var s = stage.getBoundingClientRect();
            var l = lens.getBoundingClientRect();
            var r = screen.getBoundingClientRect();
            var lx = l.left + l.width / 2 - s.left;
            var ly = l.top + l.height / 2 - s.top;
            var sx = r.left - s.left + 6;
            beamSvg.setAttribute("viewBox", "0 0 " + s.width + " " + s.height);
            var top = r.top - s.top + 4;
            var bottom = r.bottom - s.top - 4;
            var points = lx + "," + (ly - 4) + " " + sx + "," + top + " " + sx + "," + bottom + " " + lx + "," + (ly + 4);
            beamShapes.forEach(function (b) { b.setAttribute("points", points); });
            scatterMotes(lx, top, sx, bottom);
            var grad = stage.querySelector("#np-beam-grad");
            grad.setAttribute("x1", lx);
            grad.setAttribute("x2", sx);
        }

        if ("ResizeObserver" in window) {
            new ResizeObserver(drawBeam).observe(stage);
        } else {
            window.addEventListener("resize", drawBeam, { passive: true });
        }
        drawBeam();

        show(0, false);
        schedule();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
