/*
 * Interactive version of the Venice photo zone: same crossfade-in/hold/
 * fade-out box as the CSS fallback (main::before in styles.css, which stays
 * in the DOM as a static fallback until this successfully takes over), but
 * rendered on a WebGL canvas so the cursor reveals full color in a radius —
 * same reveal mechanic as the hero's Dither Reveal, just without the dither
 * pattern: a plain toned-to-color blend.
 *
 * Only one texture (full-color venice-color.jpg/webp) — the toned/dimmed
 * look and the dark overlay tint are both computed in the shader, not
 * baked into a second file.
 */
(function () {
    "use strict";

    var MAX_DPR = 2;
    var TONE_AMOUNT = 0.5; // how much original color shows in the dimmed state
    var OVERLAY = [10 / 255, 10 / 255, 12 / 255];
    var OVERLAY_STRENGTH = 0.45;

    var VERT = "attribute vec2 aPos;\n" +
        "varying vec2 vUv;\n" +
        "void main() {\n" +
        "    vUv = aPos * 0.5 + 0.5;\n" +
        "    gl_Position = vec4(aPos, 0.0, 1.0);\n" +
        "}\n";

    // Cover + bottom + center crop, derived directly (not the generic
    // ported fitUv — that one's conventions caused the earlier stretching
    // bug, so this is a small, explicit formula for exactly this case).
    var FRAG = "precision highp float;\n" +
        "uniform sampler2D uTexture;\n" +
        "uniform vec2 uMouse;\n" +
        "uniform float uMouseActive;\n" +
        "uniform float uRevealRadius;\n" +
        "uniform float uRevealSoftness;\n" +
        "uniform float uCanvasAspect;\n" +
        "uniform float uImageAspect;\n" +
        "uniform vec2 uResolution;\n" +
        "uniform vec3 uOverlay;\n" +
        "uniform float uOverlayStrength;\n" +
        "uniform float uTone;\n" +
        "varying vec2 vUv;\n" +
        "void main() {\n" +
        "    float scale = max(uCanvasAspect / uImageAspect, 1.0);\n" +
        "    float sx = uCanvasAspect / (uImageAspect * scale);\n" +
        "    float sy = 1.0 / scale;\n" +
        "    float u = vUv.x * sx + (1.0 - sx) * 0.5;\n" +
        "    float v = vUv.y * sy;\n" +
        "    vec3 color = texture2D(uTexture, vec2(u, v)).rgb;\n" +
        "    float gray = dot(color, vec3(0.299, 0.587, 0.114));\n" +
        "    vec3 dimmed = mix(vec3(gray), color, uTone);\n" +
        "    float dist = distance(vUv * uResolution, uMouse * uResolution);\n" +
        "    float innerRadius = max(0.0, uRevealRadius * (1.0 - uRevealSoftness));\n" +
        "    float outerRadius = uRevealRadius * (1.0 + uRevealSoftness) + 0.001;\n" +
        "    float revealAmount = (1.0 - smoothstep(innerRadius, outerRadius, dist)) * uMouseActive;\n" +
        "    vec3 shown = mix(dimmed, color, revealAmount);\n" +
        "    float effectiveOverlay = uOverlayStrength * (1.0 - revealAmount * 0.7);\n" +
        "    vec3 tinted = mix(shown, uOverlay, effectiveOverlay);\n" +
        "    gl_FragColor = vec4(tinted, 1.0);\n" +
        "}\n";

    function init() {
        var main = document.querySelector("body.has-hero main");
        if (!main) return;

        var canvas = document.createElement("canvas");
        canvas.id = "venice-canvas";

        var gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
        if (!gl) return;

        function compile(type, source) {
            var sh = gl.createShader(type);
            gl.shaderSource(sh, source);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.warn("VeniceReveal shader:", gl.getShaderInfoLog(sh));
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
            console.warn("VeniceReveal link:", gl.getProgramInfoLog(program));
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
        var uMouse = u("uMouse");
        var uMouseActive = u("uMouseActive");
        var uRevealRadius = u("uRevealRadius");
        var uRevealSoftness = u("uRevealSoftness");
        var uCanvasAspect = u("uCanvasAspect");
        var uImageAspect = u("uImageAspect");
        var uResolution = u("uResolution");
        var uOverlay = u("uOverlay");
        var uOverlayStrength = u("uOverlayStrength");
        var uTone = u("uTone");

        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([23, 23, 27, 255]));
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
                main.insertBefore(canvas, main.firstChild);
                document.body.classList.add("venice-canvas-ready");
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
                console.warn("VeniceReveal: photo failed to load");
            };
            fallback.src = "assets/venice-color.jpg";
        };
        img.src = "assets/venice-color.webp";

        var mouse = { x: 0.5, y: 0.5, active: 0, target: 0, entered: false };
        function onMove(e) {
            var r = canvas.getBoundingClientRect();
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
            var w = canvas.clientWidth || 1;
            var h = canvas.clientHeight || 1;
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        window.addEventListener("resize", resize, { passive: true });

        var inView = true;
        var io = new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
        }, { threshold: 0.01 });
        io.observe(canvas);

        document.addEventListener("visibilitychange", function () {
            if (!ready) return;
            if (document.hidden) {
                cancelAnimationFrame(raf);
            } else {
                raf = requestAnimationFrame(render);
            }
        });

        function render() {
            raf = requestAnimationFrame(render);
            if (!inView) return;
            mouse.active += (mouse.target - mouse.active) * 0.08;

            gl.uniform2f(uMouse, mouse.x, mouse.y);
            gl.uniform1f(uMouseActive, mouse.entered ? mouse.active : 0);
            gl.uniform1f(uRevealRadius, 230);
            gl.uniform1f(uRevealSoftness, 1.0);
            gl.uniform1f(uCanvasAspect, canvas.width / canvas.height);
            gl.uniform1f(uImageAspect, imgAspect);
            gl.uniform2f(uResolution, canvas.clientWidth || 1, canvas.clientHeight || 1);
            gl.uniform3f(uOverlay, OVERLAY[0], OVERLAY[1], OVERLAY[2]);
            gl.uniform1f(uOverlayStrength, OVERLAY_STRENGTH);
            gl.uniform1f(uTone, TONE_AMOUNT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
