/*
 * Journals section (home): each book starts closed and swings its cover open
 * when it scrolls into view. The left page's writing is copied onto the
 * cover's back face, so it turns over with the cover; when the turn ends
 * (.is-landed) the cover hides and the identical real left leaf takes over.
 * Phones and reduced-motion users get the books already open, which is
 * also the no-JS default.
 */
(function () {
    "use strict";

    var section = document.getElementById("journals");
    if (!section) return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var narrow = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
    if (reduceMotion || narrow || !("IntersectionObserver" in window)) return;

    var TURN_MS = 1600;
    var STAGGER_MS = 220;   // books that come into view together open in turn

    var books = Array.prototype.slice.call(section.querySelectorAll(".book"));

    books.forEach(function (book) {
        var leftPage = book.querySelector(".book-inner > .leaf-left .page");
        var backPage = book.querySelector(".cover-back .page");
        if (leftPage && backPage) backPage.innerHTML = leftPage.innerHTML;

        ["cover-front", "cover-back"].forEach(function (cls) {
            var face = book.querySelector("." + cls);
            if (!face) return;
            var shade = document.createElement("span");
            shade.className = "cover-shade";
            face.appendChild(shade);
        });
    });

    section.classList.add("books-armed");

    var queue = 0;
    var queueTimer = 0;

    function open(book) {
        if (book.classList.contains("is-open")) return;
        book.classList.add("is-open");
        var cover = book.querySelector(".book-cover");
        var landed = false;
        function land() {
            if (landed) return;
            landed = true;
            book.classList.add("is-landed");
        }
        cover.addEventListener("transitionend", function (e) {
            if (e.target === cover && e.propertyName === "transform") land();
        });
        // In case transitionend never fires (tab hidden mid-turn, etc.)
        setTimeout(land, TURN_MS + 300);
    }

    function schedule(book) {
        var delay = queue * STAGGER_MS;
        queue++;
        clearTimeout(queueTimer);
        queueTimer = setTimeout(function () { queue = 0; }, STAGGER_MS);
        setTimeout(function () { open(book); }, delay);
    }

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                schedule(entry.target);
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });

    books.forEach(function (book) { io.observe(book); });
})();
