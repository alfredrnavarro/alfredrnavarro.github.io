/* ===================================
   Vinyl player — a small turntable fixed to the bottom left.
   Builds its own markup and loads vinyl-player.css, so each page only
   needs one <script> tag. Add songs by editing TRACKS below.
   =================================== */
(function () {
    // src is the audio file in assets/music/. Album art and the title's
    // Apple Music link are looked up from the title and artist; set cover
    // and link to override them. Leave out src to fall back to Apple's
    // 30-second preview.
    var TRACKS = [
        { title: 'Fly',               artist: 'Djo',          src: 'assets/music/fly.mp3' },
        { title: 'Lost in Yesterday', artist: 'Tame Impala',  src: 'assets/music/lost-in-yesterday.mp3' },
        { title: "Let's Go Outside",  artist: 'Far Caspian',  src: 'assets/music/lets-go-outside.mp3' },
        { title: 'oh yeah',           artist: 'Steve Lacy',   src: 'assets/music/oh-yeah.mp3',
          cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/1c/b2/46/1cb246db-afae-a599-d377-44a7ea7267fa/196874346976.jpg/200x200bb.jpg',
          link: 'https://music.apple.com/us/album/oh-yeah/6773775032' },
        { title: 'The Moment',        artist: 'Tame Impala',  src: 'assets/music/the-moment.mp3' }
    ];

    if (!TRACKS.length) return;

    // Resolve paths against this script's location so project subpages
    // (projects/*.html, which load ../vinyl-player.js) find the same files.
    var base = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
    function url(path) { return !path ? '' : /^https?:/.test(path) ? path : base + path; }

    var STORE_KEY = 'vinyl-state';
    var CACHE_PREFIX = 'vinyl-lookup:';

    // Resolves a track to { src, cover, link }. A local src plays the full
    // song; anything missing (preview clip, artwork, link) comes from the
    // iTunes Search API. Lookups are cached in localStorage per visitor.
    function resolve(track) {
        if (track.src && track.cover) {
            return Promise.resolve({ src: url(track.src), cover: url(track.cover), link: track.link || '' });
        }
        return lookup(track).then(function (found) {
            if (!track.src) return found;
            return { src: url(track.src), cover: url(track.cover) || found.cover, link: track.link || found.link };
        }, function (err) {
            if (track.src) return { src: url(track.src), cover: '', link: track.link || '' };
            throw err;
        });
    }

    function lookup(track) {
        var key = CACHE_PREFIX + track.artist + '|' + track.title;
        try {
            var hit = JSON.parse(localStorage.getItem(key) || 'null');
            if (hit && hit.src) return Promise.resolve(hit);
        } catch (e) {}

        var q = encodeURIComponent(track.artist + ' ' + track.title);
        return fetch('https://itunes.apple.com/search?media=music&entity=song&limit=10&term=' + q)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var results = (data && data.results || []).filter(function (r) { return r.previewUrl; });
                var artist = (track.artist || '').toLowerCase();
                var title = track.title.toLowerCase();
                var match = results.filter(function (r) {
                    return r.artistName.toLowerCase().indexOf(artist) !== -1 && r.trackName.toLowerCase() === title;
                })[0] || results.filter(function (r) {
                    return r.artistName.toLowerCase().indexOf(artist) !== -1;
                })[0] || results[0];
                if (!match) throw new Error('not found');
                var found = {
                    src: match.previewUrl,
                    cover: (match.artworkUrl100 || '').replace('100x100bb', '200x200bb'),
                    link: match.trackViewUrl || ''
                };
                try { localStorage.setItem(key, JSON.stringify(found)); } catch (e) {}
                return found;
            });
    }

    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = url('vinyl-player.css');
    document.head.appendChild(css);

    var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
    var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
    var ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5.5v13L15 12zM15.5 5.5H18.5v13h-3z" fill="currentColor"/></svg>';

    function init() {
        var root = document.createElement('div');
        root.className = 'vinyl';
        root.setAttribute('role', 'region');
        root.setAttribute('aria-label', 'Music player');
        root.innerHTML =
            '<div class="vinyl-deck" aria-hidden="true">' +
                '<div class="vinyl-disc"><span class="vinyl-label"><img alt="" decoding="async"></span></div>' +
                '<span class="vinyl-arm"></span>' +
            '</div>' +
            '<div class="vinyl-meta">' +
                '<a class="vinyl-title" target="_blank" rel="noopener"></a>' +
                '<span class="vinyl-artist"></span>' +
                '<span class="vinyl-progress"><span class="vinyl-progress-fill"></span></span>' +
            '</div>' +
            '<div class="vinyl-controls">' +
                '<button type="button" class="vinyl-btn vinyl-toggle" aria-label="Play">' + ICON_PLAY + '</button>' +
                '<button type="button" class="vinyl-btn vinyl-next" aria-label="Next song">' + ICON_NEXT + '</button>' +
            '</div>';
        document.body.appendChild(root);
        document.body.classList.add('has-vinyl');

        var audio = new Audio();
        audio.preload = 'none'; // nothing downloads until someone presses play
        audio.volume = 0.6;

        var img = root.querySelector('.vinyl-label img');
        var titleEl = root.querySelector('.vinyl-title');
        var artistEl = root.querySelector('.vinyl-artist');
        var fill = root.querySelector('.vinyl-progress-fill');
        var toggle = root.querySelector('.vinyl-toggle');
        var nextBtn = root.querySelector('.vinyl-next');

        var index = 0;
        var resumeAt = 0;
        var wasPlaying = false;
        try {
            var saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
            if (saved && saved.i >= 0 && saved.i < TRACKS.length) {
                index = saved.i;
                resumeAt = saved.t || 0;
                wasPlaying = !!saved.p;
            }
        } catch (e) {}

        img.addEventListener('error', function () { img.hidden = true; });

        var ready = Promise.resolve();

        function load(i) {
            index = (i + TRACKS.length) % TRACKS.length;
            var track = TRACKS[index];
            var mine = index;
            titleEl.textContent = track.title;
            titleEl.removeAttribute('href');
            artistEl.textContent = track.artist || '';
            root.title = track.title + (track.artist ? ' — ' + track.artist : '');
            img.hidden = true;
            fill.style.transform = 'scaleX(0)';
            audio.removeAttribute('src');

            ready = resolve(track).then(function (info) {
                if (mine !== index) return; // skipped ahead before this resolved
                audio.src = info.src;
                if (info.link) titleEl.href = info.link;
                if (info.cover) { img.src = info.cover; img.hidden = false; }
            }, function () {
                if (mine === index) artistEl.textContent = 'Song not found';
            });
            return ready;
        }

        function play() {
            ready.then(function () {
                if (!audio.src) return;
                var p = audio.play();
                if (p && p.catch) p.catch(function () { setPlaying(false); });
            });
        }

        function setPlaying(on) {
            root.classList.toggle('is-playing', on);
            toggle.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
            toggle.setAttribute('aria-label', on ? 'Pause' : 'Play');
        }

        function save() {
            try {
                sessionStorage.setItem(STORE_KEY, JSON.stringify({
                    i: index, t: audio.currentTime || 0, p: !audio.paused
                }));
            } catch (e) {}
        }

        toggle.addEventListener('click', function () {
            if (audio.paused) play(); else audio.pause();
        });

        nextBtn.addEventListener('click', function () {
            var playing = !audio.paused;
            load(index + 1);
            if (playing) play();
            save();
        });

        audio.addEventListener('play', function () { setPlaying(true); });
        audio.addEventListener('pause', function () { setPlaying(false); save(); });
        audio.addEventListener('ended', function () { load(index + 1); play(); });
        audio.addEventListener('timeupdate', function () {
            if (audio.duration) fill.style.transform = 'scaleX(' + (audio.currentTime / audio.duration) + ')';
        });
        audio.addEventListener('error', function () {
            if (!audio.getAttribute('src')) return;
            setPlaying(false);
            artistEl.textContent = 'Could not load this song';
        });

        // Carry the song and position over when visitors move between pages.
        window.addEventListener('pagehide', save);

        load(index);
        if (resumeAt) {
            audio.preload = 'metadata';
            audio.addEventListener('loadedmetadata', function seek() {
                audio.removeEventListener('loadedmetadata', seek);
                audio.currentTime = Math.min(resumeAt, audio.duration || resumeAt);
            });
        }
        // Browsers may refuse to resume without a fresh click; the play
        // button then just shows as paused.
        if (wasPlaying) play();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
