/*
 * Round Carousel (ported from the Originkit React component): a ring of
 * images in CSS 3D space that auto-rotates and can be dragged to spin with
 * momentum. Pure DOM + CSS transforms, no WebGL/canvas needed.
 *
 * Starting set of real photos — add more to DEFAULT_IMAGES as they come in.
 */
(function () {
    "use strict";

    var DEFAULT_IMAGES = [
        "assets/carousel-1.jpg",
        "assets/carousel-2.jpg",
        "assets/carousel-3.jpg",
        "assets/carousel-4.jpg",
        "assets/carousel-5.jpg",
        "assets/carousel-6.jpg",
        "assets/carousel-7.jpg",
        "assets/carousel-8.jpg",
        "assets/carousel-9.jpg",   // Ely
        "assets/carousel-10.jpg",  // Ian
        "assets/carousel-11.jpg",  // Tyler
    ];

    // One link per image, same order as DEFAULT_IMAGES above. Matched by
    // name where the filename made it obvious. Two were inferred rather
    // than explicitly confirmed — flag for review:
    //   - carousel-2 (unnamed source file) -> matheus.wiki, by elimination
    //     (the one link left with no obvious name match)
    //   - carousel-3 (nick.jpg) -> nicolasmurg.github.io, assuming "Nick"
    //     is short for Nicolas Murguia
    var DEFAULT_LINKS = [
        "https://luanamaldaner.github.io/",
        "https://matheus.wiki/index.html",
        "https://nicolasmurg.github.io/NicolasMurguia/",
        "https://www.linkedin.com/in/yimo-liu/?isSelfProfile=false",
        "https://www.linkedin.com/in/edison-liu-328232298/?isSelfProfile=false",
        "https://jaimebreitkreutz.com/",
        "https://www.linkedin.com/in/raamia/?isSelfProfile=false",
        "https://www.linkedin.com/in/anhhoangmai2007/?isSelfProfile=false",
        "https://www.linkedin.com/in/ely-herman-506143361",
        "https://www.linkedin.com/in/ian-greyvensteyn-9b98903b3/",
        "https://www.linkedin.com/in/tyler-alves-komitor/",
    ];

    var CFG = {
        imageWidth: 220,
        imageHeight: 220,
        // Back to the component's own default now that there are 8 images —
        // more images widens the ring on its own, so the spacing=9 bump
        // used for the earlier 3-image set isn't needed anymore.
        spacing: 3,
        speed: 2, // matches the component's own preset override
        direction: "right",
        drag: true,
        sensitivity: 5,
        tilt: -7,
        perspective: 1600,
        cornerRadius: 22,
        innerDim: 3.5,
        background: "transparent", // was #000000 in the original; this site's dark section already supplies the backdrop
    };

    // "luanamaldaner.github.io" or "LinkedIn: yimo-liu"
    function friendLabel(url) {
        try {
            var u = new URL(url);
            var m = u.pathname.match(/\/in\/([^/]+)/);
            if (u.hostname.indexOf("linkedin.com") !== -1 && m) return "LinkedIn: " + m[1];
            return u.hostname.replace(/^www\./, "");
        } catch (err) {
            return url;
        }
    }

    function build(container, srcs, links) {
        var count = srcs.length;
        var angle = 360 / count;
        var factor = 1 + CFG.spacing * 0.15;
        var radius = (CFG.imageWidth * factor) / (2 * Math.tan(Math.PI / count));
        var degPerSec = CFG.speed * 6 * (CFG.direction === "left" ? -1 : 1);

        container.innerHTML = "";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
        container.style.overflow = "hidden";
        container.style.background = CFG.background;
        container.style.perspective = CFG.perspective + "px";
        container.style.cursor = CFG.drag ? "grab" : "default";
        container.style.touchAction = "none";

        var tiltWrap = document.createElement("div");
        tiltWrap.style.transformStyle = "preserve-3d";
        tiltWrap.style.transform = "rotateX(" + CFG.tilt + "deg)";

        var ring = document.createElement("div");
        ring.style.position = "relative";
        ring.style.width = CFG.imageWidth + "px";
        ring.style.height = CFG.imageHeight + "px";
        ring.style.transformStyle = "preserve-3d";

        srcs.forEach(function (src, i) {
            var link = links && links[i];
            // A real link when there is one, so it is focusable and announced
            var item = document.createElement(link ? "a" : "div");
            item.style.position = "absolute";
            item.style.inset = "0";
            item.style.transform = "rotateY(" + (i * angle) + "deg) translateZ(" + radius + "px)";
            item.style.transformStyle = "preserve-3d";
            if (link) {
                item.href = link;
                item.target = "_blank";
                item.rel = "noopener";
                item.className = "carousel-friend";
                // Links are natively draggable, which would cancel the spin-drag
                item.draggable = false;
                item.setAttribute("aria-label", "Visit " + friendLabel(link));
                item.dataset.link = link;
                item.style.cursor = "pointer";
            }

            var front = document.createElement("div");
            front.style.position = "absolute";
            front.style.inset = "0";
            front.style.borderRadius = CFG.cornerRadius + "px";
            front.style.overflow = "hidden";
            front.style.backfaceVisibility = "hidden";
            front.style.backgroundSize = "cover";
            front.style.backgroundPosition = "center";
            front.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
            front.style.backgroundImage = "url(" + src + ")";

            var back = document.createElement("div");
            back.style.position = "absolute";
            back.style.inset = "0";
            back.style.borderRadius = CFG.cornerRadius + "px";
            back.style.overflow = "hidden";
            back.style.backfaceVisibility = "hidden";
            back.style.backgroundSize = "cover";
            back.style.backgroundPosition = "center";
            back.style.transform = "rotateY(180deg)";
            back.style.filter = "brightness(" + (CFG.innerDim / 10) + ")";
            back.style.backgroundImage = "url(" + src + ")";

            item.appendChild(front);
            item.appendChild(back);
            ring.appendChild(item);
        });

        tiltWrap.appendChild(ring);
        container.appendChild(tiltWrap);

        // Projected half-extents of the whole ring, sampled over a full turn
        // (photo corners through rotateY, the ring's -radius push, the tilt
        // and the perspective divide), so the stage can be sized to fit it
        var extent = (function () {
            var t = CFG.tilt * Math.PI / 180;
            var P = CFG.perspective;
            var hw = CFG.imageWidth / 2, hh = CFG.imageHeight / 2;
            var maxX = 0, maxY = 0;
            for (var deg = 0; deg < 360; deg += 2) {
                var p = deg * Math.PI / 180;
                [-hw, hw].forEach(function (cx) {
                    [-hh, hh].forEach(function (cy) {
                        var x = cx * Math.cos(p) + radius * Math.sin(p);
                        var z = -cx * Math.sin(p) + radius * Math.cos(p) - radius;
                        var y = cy * Math.cos(t) - z * Math.sin(t);
                        var z2 = cy * Math.sin(t) + z * Math.cos(t);
                        var k = P / (P - z2);
                        maxX = Math.max(maxX, Math.abs(x * k));
                        maxY = Math.max(maxY, Math.abs(y * k));
                    });
                });
            }
            return { x: maxX, y: maxY };
        })();

        // Room for the hover glow and drop shadow around the outer photos
        var EDGE = 40;

        // Shrink the ring (scaling perspective with it, so the projection
        // scales uniformly) when the stage is narrower than the ring, and
        // grow the stage's height to whatever the ring needs
        function fit() {
            var avail = container.clientWidth / 2 - EDGE;
            var s = Math.min(1, avail / extent.x);
            tiltWrap.style.transform = "scale3d(" + s + "," + s + "," + s + ") rotateX(" + CFG.tilt + "deg)";
            container.style.perspective = (CFG.perspective * s) + "px";
            container.style.height = Math.ceil(2 * (extent.y * s + EDGE)) + "px";
        }
        fit();
        window.addEventListener("resize", fit);

        var rotY = 0;
        var vel = 0;
        var last = 0;
        var raf = 0;
        // `link` is the friend under the pointer when the press started.
        // Pointer capture retargets the later click to the container, so
        // the click itself can't tell us which photo was hit.
        var dragState = { active: false, x: 0, moved: 0, link: null };

        function apply() {
            ring.style.transform = "translateZ(" + -radius + "px) rotateY(" + rotY + "deg)";
        }
        apply();

        // Auto-spin eases to a stop while a mouse is over the ring, so a
        // photo holds still long enough to be clicked
        var hovering = false;
        var spin = degPerSec;

        function draw(now) {
            raf = requestAnimationFrame(draw);
            var dt = last ? (now - last) / 1000 : 0;
            last = now;
            var f = Math.min(dt, 0.1);
            spin += ((hovering ? 0 : degPerSec) - spin) * Math.min(1, f * 5);
            if (!dragState.active) {
                if (Math.abs(vel) > 0.01) {
                    rotY += vel * f;
                    vel *= 0.94;
                } else {
                    rotY += spin * f;
                }
            }
            apply();
        }

        var inView = true;
        var io = new IntersectionObserver(function (entries) {
            var wasInView = inView;
            inView = entries[0].isIntersecting;
            if (inView && !wasInView) {
                last = 0;
                raf = requestAnimationFrame(draw);
            } else if (!inView && wasInView) {
                cancelAnimationFrame(raf);
            }
        }, { threshold: 0.01 });
        io.observe(container);
        raf = requestAnimationFrame(draw);

        document.addEventListener("visibilitychange", function () {
            if (!inView) return;
            if (document.hidden) {
                cancelAnimationFrame(raf);
            } else {
                last = 0;
                raf = requestAnimationFrame(draw);
            }
        });

        container.addEventListener("pointerenter", function (e) {
            if (e.pointerType === "mouse") hovering = true;
        });
        container.addEventListener("pointerleave", function (e) {
            if (e.pointerType === "mouse") hovering = false;
        });

        // A press only becomes a drag after this much travel, so the small
        // wobble of a normal click doesn't spin the ring away
        var DRAG_THRESHOLD = 6;

        if (CFG.drag) {
            container.addEventListener("pointerdown", function (e) {
                if (e.button !== undefined && e.button !== 0) return;
                dragState.active = true;
                dragState.x = e.clientX;
                dragState.moved = 0;
                var hit = e.target.closest ? e.target.closest("[data-link]") : null;
                dragState.link = hit ? hit.dataset.link : null;
                vel = 0;
                if (container.setPointerCapture) container.setPointerCapture(e.pointerId);
                container.style.cursor = "grabbing";
            });
            container.addEventListener("pointermove", function (e) {
                if (!dragState.active) return;
                var dx = e.clientX - dragState.x;
                dragState.x = e.clientX;
                dragState.moved += Math.abs(dx);
                if (dragState.moved <= DRAG_THRESHOLD) return;
                var k = 0.3 * CFG.sensitivity;
                rotY += dx * k;
                vel = dx * k * 60;
            });
            function end() {
                dragState.active = false;
                container.style.cursor = "grab";
            }
            // A press that never became a drag opens the friend it started
            // on, right on release rather than waiting for the click event
            container.addEventListener("pointerup", function () {
                var link = dragState.link;
                dragState.link = null;
                if (dragState.active && dragState.moved <= DRAG_THRESHOLD && link) {
                    vel = 0;
                    window.open(link, "_blank", "noopener");
                }
                end();
            });
            container.addEventListener("pointercancel", function () {
                dragState.link = null;
                end();
            });
        }

        // Pointer presses are handled on release above; stop the browser's
        // own link click from opening a second tab. Keyboard activation
        // (Enter on a focused photo, detail 0) falls through to the link.
        container.addEventListener("click", function (e) {
            if (e.detail !== 0) e.preventDefault();
        });
    }

    function init() {
        var container = document.getElementById("round-carousel");
        if (!container) return;
        build(container, DEFAULT_IMAGES, DEFAULT_LINKS);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
