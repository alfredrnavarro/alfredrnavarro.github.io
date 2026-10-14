/*
 * Hero photo backdrop (Dither Reveal, ported from Originkit): renders the
 * portrait photo as a dithered monochrome image inside the #hero section on
 * the home page in ink / brass / parchment tones, revealing true color in a soft radius around the cursor.
 * Plain WebGL1, no dependencies.
 *
 * Lives inside #hero (not position: fixed), so it scrolls with the page like
 * any other content. Sizing/position/entrance-animation are all CSS (see
 * #hero / #dither-bg / .hero-text in styles.css) — this file only owns the
 * canvas + WebGL rendering.
 *
 * fitUv is NOT the original component's version — that one's "contain"
 * branch was wrong for a tall image in a wide viewport (it left the
 * horizontal axis unscaled, stretching the photo). This is a corrected,
 * from-scratch cover/contain derivation, plus a uShiftX offset to pan the
 * (otherwise-centered) image horizontally.
 */
(function () {
    "use strict";

    var DITHER_INDEX = { bayer8: 0, lines: 1, noise: 2 };
    var MAX_DPR = 2;

    var VERT = "attribute vec2 aPos;\n" +
        "varying vec2 vUv;\n" +
        "void main() {\n" +
        "    vUv = aPos * 0.5 + 0.5;\n" +
        "    gl_Position = vec4(aPos, 0.0, 1.0);\n" +
        "}\n";

    var FRAG = "precision highp float;\n" +
        "uniform sampler2D uTexture;\n" +
        "uniform float uTime;\n" +
        "uniform vec2 uMouse;\n" +
        "uniform float uMouseActive;\n" +
        "uniform float uRevealRadius;\n" +
        "uniform float uRevealSoftness;\n" +
        "uniform float uPixelSize;\n" +
        "uniform float uDitherStyle;\n" +
        "uniform float uWaveSpeed;\n" +
        "uniform float uWaveFrequency;\n" +
        "uniform float uWaveAmplitude;\n" +
        "uniform float uWaveMargin;\n" +
        "uniform float uCanvasAspect;\n" +
        "uniform float uImageAspect;\n" +
        "uniform vec2 uResolution;\n" +
        "uniform float uFit;\n" +
        "uniform float uFocusY;\n" +
        "uniform float uShiftX;\n" +
        "varying vec2 vUv;\n" +
        "float Bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }\n" +
        "float Bayer4(vec2 a) { return Bayer2(a * 0.5) * 0.25 + Bayer2(a); }\n" +
        "float Bayer8(vec2 a) { return Bayer4(a * 0.5) * 0.25 + Bayer2(a); }\n" +
        "float ign(vec2 p) { return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }\n" +
        "float ordered3(float gray, float thr) {\n" +
        "    float adj = gray + (thr - 0.5) * 0.5;\n" +
        "    return adj < 0.33 ? 0.0 : (adj < 0.66 ? 0.5 : 1.0);\n" +
        "}\n" +
        "float ditherTone(float gray, float ps) {\n" +
        "    vec2 fc = gl_FragCoord.xy / ps;\n" +
        "    if (uDitherStyle < 0.5) {\n" +
        "        return ordered3(gray, Bayer8(fc));\n" +
        "    } else if (uDitherStyle < 1.5) {\n" +
        "        float period = ps * 4.0;\n" +
        "        float v = fract((gl_FragCoord.x + gl_FragCoord.y) / period);\n" +
        "        return 1.0 - step(v, 1.0 - gray);\n" +
        "    }\n" +
        "    return step(ign(fc), gray);\n" +
        "}\n" +
        "vec2 fitUv(vec2 uv) {\n" +
        "    float ratio = uCanvasAspect / uImageAspect;\n" +
        "    float scale = uFit > 0.5 ? min(ratio, 1.0) : max(ratio, 1.0) * (1.0 + 2.0 * uWaveMargin);\n" +
        "    vec2 s = vec2(uCanvasAspect / (scale * uImageAspect), 1.0 / scale);\n" +
        "    vec2 out_ = (uv - 0.5) * s + 0.5;\n" +
        "    out_.x += uShiftX;\n" +
        "    out_.y += (1.0 - s.y) * (0.5 - uFocusY) * step(s.y, 1.0);\n" +
        "    return out_;\n" +
        "}\n" +
        "void main() {\n" +
        "    vec2 uv = vUv;\n" +
        "    float time = uTime;\n" +
        "    float waveStrength = uWaveAmplitude * 0.1;\n" +
        "    float revealNorm = uRevealRadius / max(min(uResolution.x, uResolution.y), 1.0);\n" +
        "    float wave1 = sin(uv.y * uWaveFrequency + time * uWaveSpeed) * waveStrength;\n" +
        "    float wave2 = sin(uv.x * uWaveFrequency * 0.7 + time * uWaveSpeed * 0.8) * waveStrength * 0.5;\n" +
        "    vec2 distortedUv = uv;\n" +
        "    distortedUv.x += wave1;\n" +
        "    distortedUv.y += wave2;\n" +
        "    if (uMouseActive > 0.01) {\n" +
        "        float dist = distance(uv, uMouse);\n" +
        "        float mouseInfluence = smoothstep(revealNorm, 0.0, dist);\n" +
        "        float ripple = sin(dist * uWaveFrequency * 5.0 - time * uWaveSpeed) * uWaveAmplitude * 0.05 * mouseInfluence * uMouseActive;\n" +
        "        distortedUv.x += ripple;\n" +
        "        distortedUv.y += ripple;\n" +
        "    }\n" +
        "    vec2 sampleUv = fitUv(distortedUv);\n" +
        "    vec4 color = texture2D(uTexture, sampleUv);\n" +
        "    vec2 inside = step(vec2(0.0), sampleUv) * step(sampleUv, vec2(1.0));\n" +
        "    color *= inside.x * inside.y;\n" +
        "    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));\n" +
        "    float ps = max(uPixelSize, 0.25);\n" +
        "    float tone = ditherTone(gray, ps);\n" +
        "    vec3 ink = vec3(0.047, 0.051, 0.047);\n" +
        "    vec3 brass = vec3(0.50, 0.39, 0.21);\n" +
        "    vec3 parchment = vec3(0.90, 0.85, 0.75);\n" +
        "    vec3 ditherColor = tone < 0.5 ? mix(ink, brass, tone * 2.0) : mix(brass, parchment, (tone - 0.5) * 2.0);\n" +
        "    float revealDist = distance(uv * uResolution, uMouse * uResolution);\n" +
        "    float innerRadius = max(0.0, uRevealRadius * (1.0 - uRevealSoftness));\n" +
        "    float outerRadius = uRevealRadius * (1.0 + uRevealSoftness) + 0.001;\n" +
        "    float revealAmount = (1.0 - smoothstep(innerRadius, outerRadius, revealDist)) * uMouseActive;\n" +
        "    gl_FragColor = vec4(mix(ditherColor, color.rgb, revealAmount), color.a);\n" +
        "}\n";

    function clamp(n, min, max, fallback) {
        var v = typeof n === "number" ? n : parseFloat(n);
        if (!isFinite(v)) return fallback;
        return Math.min(max, Math.max(min, v));
    }

    function init() {
        var hero = document.getElementById("hero");
        if (!hero) return;

        var opts = {
            fit: "contain",
            focusY: 30,
            shiftX: 0.5, // positive = shift the image left on screen
            ditherStyle: "lines",
            dotSize: 3,
            revealRadius: 160,
            revealSoftness: 100,
            wave: false,
        };

        var root = document.createElement("div");
        root.id = "dither-bg";

        var canvas = document.createElement("canvas");
        root.appendChild(canvas);

        var gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
        if (!gl) return;

        function compile(type, source) {
            var sh = gl.createShader(type);
            gl.shaderSource(sh, source);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.warn("DitherBG shader:", gl.getShaderInfoLog(sh));
            }
            return sh;
        }

        var vs = compile(gl.VERTEX_SHADER, VERT);
        var fs = compile(gl.FRAGMENT_SHADER, FRAG);
        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.warn("DitherBG link:", gl.getProgramInfoLog(program));
            return;
        }
        gl.useProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var aPos = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        function u(name) { return gl.getUniformLocation(program, name); }
        var uTime = u("uTime");
        var uMouse = u("uMouse");
        var uMouseActive = u("uMouseActive");
        var uRevealRadius = u("uRevealRadius");
        var uRevealSoftness = u("uRevealSoftness");
        var uPixelSize = u("uPixelSize");
        var uDitherStyle = u("uDitherStyle");
        var uWaveSpeed = u("uWaveSpeed");
        var uWaveFrequency = u("uWaveFrequency");
        var uWaveAmplitude = u("uWaveAmplitude");
        var uWaveMargin = u("uWaveMargin");
        var uCanvasAspect = u("uCanvasAspect");
        var uImageAspect = u("uImageAspect");
        var uResolution = u("uResolution");
        var uFit = u("uFit");
        var uFocusY = u("uFocusY");
        var uShiftX = u("uShiftX");

        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        var imgAspect = 0.75;
        var raf = 0;
        var ready = false;

        function onImageReady(img) {
            if (img.naturalHeight > 0) imgAspect = img.naturalWidth / img.naturalHeight;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            try {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            } catch (e) {}
            if (!ready) {
                ready = true;
                // Inserted only now, so the CSS entrance animation on
                // #dither-bg (see styles.css) plays from the moment the
                // real photo is actually ready to show.
                hero.insertBefore(root, hero.firstChild);
                resize();
                raf = requestAnimationFrame(render);
            }
        }

        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () { onImageReady(img); };
        img.onerror = function () {
            var fallback = new Image();
            fallback.crossOrigin = "anonymous";
            fallback.onload = function () { onImageReady(fallback); };
            fallback.onerror = function () {
                console.warn("DitherBG: photo failed to load");
            };
            fallback.src = "assets/alfred-photo.png";
        };
        img.src = "assets/alfred-photo.webp";

        var mouse = { x: 0.5, y: 0.5, active: 0, target: 0, entered: false };
        function onMove(e) {
            var r = hero.getBoundingClientRect();
            mouse.x = (e.clientX - r.left) / r.width;
            mouse.y = 1 - (e.clientY - r.top) / r.height;
            var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            mouse.entered = true;
            mouse.target = inside ? 1 : 0;
        }
        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerout", function (e) {
            if (!e.relatedTarget) mouse.target = 0;
        });

        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            var w = hero.clientWidth || 1;
            var h = hero.clientHeight || 1;
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        window.addEventListener("resize", resize, { passive: true });

        var inView = true;
        var io = new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
        }, { threshold: 0.01 });
        io.observe(hero);

        document.addEventListener("visibilitychange", function () {
            if (!ready) return;
            if (document.hidden) {
                cancelAnimationFrame(raf);
            } else {
                raf = requestAnimationFrame(render);
            }
        });

        var start = performance.now();
        function render(now) {
            raf = requestAnimationFrame(render);
            if (!inView) return;
            mouse.active += (mouse.target - mouse.active) * 0.08;

            gl.uniform1f(uTime, (now - start) / 1000);
            gl.uniform2f(uMouse, mouse.x, mouse.y);
            gl.uniform1f(uMouseActive, mouse.entered ? mouse.active : 0);
            gl.uniform1f(uRevealRadius, opts.revealRadius);
            gl.uniform1f(uRevealSoftness, clamp(opts.revealSoftness, 0, 100, 100) / 100);
            gl.uniform1f(uPixelSize, clamp(opts.dotSize, 1, 20, 3) / 2);
            gl.uniform1f(uDitherStyle, DITHER_INDEX[opts.ditherStyle] != null ? DITHER_INDEX[opts.ditherStyle] : 1);
            gl.uniform1f(uWaveSpeed, 0);
            gl.uniform1f(uWaveFrequency, 0.5);
            gl.uniform1f(uWaveAmplitude, 0);
            gl.uniform1f(uWaveMargin, 0);
            gl.uniform1f(uCanvasAspect, canvas.width / canvas.height);
            gl.uniform1f(uImageAspect, imgAspect);
            gl.uniform2f(uResolution, hero.clientWidth || 1, hero.clientHeight || 1);
            gl.uniform1f(uFit, opts.fit === "contain" ? 1 : 0);
            gl.uniform1f(uFocusY, clamp(opts.focusY, 0, 100, 30) / 100);
            gl.uniform1f(uShiftX, opts.shiftX);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
