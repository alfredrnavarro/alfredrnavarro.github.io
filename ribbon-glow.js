/*
 * Ribbon Glow background (ported from the Originkit React component to vanilla
 * WebGL2 for this static site). Colors track the active theme's --color-global-bg /
 * --color-primary / --color-primary-light and update live on theme toggle.
 */
(function () {
    "use strict";

    if (document.getElementById("ribbon-glow-bg")) return;

    var MAX_DPR = 2;
    var NAME = "RibbonGlow";
    var LAYERS = 84;
    var TWIST = 1.25;
    var DRAG = 0.18;

    // Tuned to the component's own defaults (speed/size/angle/hover/reach 50/100/-180/100/240).
    var CFG = {
        speed: 1,
        size: 1,
        angle: (-180 * Math.PI) / 180,
        hover: 1,
        reach: 240,
    };

    var VERT_SRC = "#version 300 es\n" +
        "const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));\n" +
        "void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }\n";

    var FIELD_SRC = "#version 300 es\n" +
        "precision highp float;\n" +
        "uniform vec2 uRes;\n" +
        "uniform float uTime;\n" +
        "uniform vec3 uC1;\n" +
        "uniform vec3 uC2;\n" +
        "uniform float uSize;\n" +
        "uniform float uAngle;\n" +
        "uniform vec2 uMouse;\n" +
        "uniform float uOn;\n" +
        "uniform float uReach;\n" +
        "uniform vec2 uVel;\n" +
        "out vec4 o;\n" +
        "const float TAU = 6.28318530718;\n" +
        "const float LAYERS = " + LAYERS.toFixed(1) + ";\n" +
        "const float TWIST = " + TWIST.toFixed(3) + ";\n" +
        "const float DRAG = " + DRAG.toFixed(3) + ";\n" +
        "const float GAIN = 0.62;\n" +
        "const vec2 CENTRE = vec2(-0.62, 0.24);\n" +
        "const float TILT = 0.6;\n" +
        "const float ZOOM = 1.05;\n" +
        "const float THETA = 2.13;\n" +
        "const float SHEAR = 0.963;\n" +
        "const float SHRINK = 0.953;\n" +
        "const vec2 WARP_FREQ = vec2(0.42, 2.4);\n" +
        "const vec2 WARP_AMP = vec2(0.13, 0.027);\n" +
        "const vec2 ASPECT = vec2(2.1, 0.17);\n" +
        "const float OFFSET = 0.36;\n" +
        "const float GLOW = 0.0021;\n" +
        "const float SOFT = 0.0019;\n" +
        "const float FALLOFF = 0.37;\n" +
        "const float PHASE = 12.0;\n" +
        "const float CYCLE = 0.16;\n" +
        "const float HUE_TRAVEL = 2.0;\n" +
        "mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }\n" +
        "void main() {\n" +
        "  vec2 R = uRes;\n" +
        "  vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y;\n" +
        "  vec2 d = pos - uMouse;\n" +
        "  float w = uOn * exp(-dot(d, d) / (uReach * uReach));\n" +
        "  if (w > 1e-4) pos = uMouse + rot(w * TWIST) * d * (1.0 - 0.3 * min(w, 1.0)) - uVel * min(w, 1.0) * DRAG;\n" +
        "  pos = rot(uAngle) * pos / uSize;\n" +
        "  float t = uTime * 0.49 + PHASE;\n" +
        "  float breath = (-sin(uTime * 0.735) + sin(uTime * 0.49 + 1.0)) * 0.25 + 0.5;\n" +
        "  vec2 u = rot(TILT) * ((pos - CENTRE) * (ZOOM - breath * 0.085));\n" +
        "  mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));\n" +
        "  vec3 col = vec3(0.0);\n" +
        "  for (float i = 1.0; i <= LAYERS; i += 1.0) {\n" +
        "    u.x -= sin(u.y * WARP_FREQ.x + t + i * 0.007) * WARP_AMP.x;\n" +
        "    u.y -= sin(u.x * WARP_FREQ.y - t + i * 0.02) * WARP_AMP.y;\n" +
        "    u = fold * u * SHRINK;\n" +
        "    vec2 q = (u - vec2(OFFSET + breath * 0.1, 0.0)) * ASPECT;\n" +
        "    float g = GLOW / (dot(q, q) + SOFT) * (0.25 + breath * 0.4);\n" +
        "    float r = length(u);\n" +
        "    float k = sin(i * CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;\n" +
        "    col += g * mix(uC1, uC2, k) * (0.62 + 0.5 * k) * exp2(-r * FALLOFF);\n" +
        "  }\n" +
        "  vec3 x = max(col * GAIN, 0.0);\n" +
        "  col = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);\n" +
        "  col = pow(clamp(col, 0.0, 1.0), vec3(0.85, 0.92, 0.98));\n" +
        "  col *= 1.0 - smoothstep(0.5, 1.6, length(pos)) * 0.07;\n" +
        "  o = vec4(col, 1.0);\n" +
        "}\n";

    var FINISH_SRC = "#version 300 es\n" +
        "precision highp float;\n" +
        "uniform sampler2D uField;\n" +
        "uniform vec2 uRes;\n" +
        "uniform float uTime;\n" +
        "uniform vec3 uBg;\n" +
        "uniform float uPaper;\n" +
        "out vec4 o;\n" +
        "float ign(vec2 p, float f) { p += 5.588238 * mod(f, 64.0); return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }\n" +
        "void main() {\n" +
        "  vec2 frag = gl_FragCoord.xy;\n" +
        "  vec3 L = max(texture(uField, frag / uRes).rgb, 0.0);\n" +
        "  vec3 dark = uBg + L * (1.0 - uBg);\n" +
        "  float strength = clamp(max(L.r, max(L.g, L.b)), 0.0, 1.0);\n" +
        "  vec3 paper = uBg * (1.0 - strength) + L * 0.96;\n" +
        "  vec3 col = mix(dark, paper, uPaper);\n" +
        "  col += (ign(frag, floor(uTime * 24.0)) - 0.5) / 255.0;\n" +
        "  o = vec4(clamp(col, 0.0, 1.0), 1.0);\n" +
        "}\n";

    var colorCache = new Map();

    function parseColor(input) {
        if (!input) return null;
        var key = String(input);
        if (colorCache.has(key)) return colorCache.get(key);
        var s = key.trim();
        var v = s.match(/^var\(\s*--[^,]+,\s*(.+)\)$/);
        if (v) s = v[1].trim();
        var out = null;
        if (s.charAt(0) === "#") {
            var h = s.slice(1);
            if (h.length === 3 || h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            if (h.length >= 6) {
                var r = parseInt(h.slice(0, 2), 16);
                var g = parseInt(h.slice(2, 4), 16);
                var b = parseInt(h.slice(4, 6), 16);
                if (isFinite(r) && isFinite(g) && isFinite(b)) out = [r / 255, g / 255, b / 255];
            }
        } else {
            var m = s.match(/^(rgba?|hsla?)\(([^)]*)\)/i);
            if (m) {
                var parts = m[2].split(/[\s,/]+/).filter(Boolean);
                var f = function (i) { return parseFloat(parts[i]); };
                if (parts.length >= 3 && [0, 1, 2].every(function (i) { return isFinite(f(i)); })) {
                    if (m[1].toLowerCase().indexOf("rgb") === 0) {
                        var ch = function (i) { return parts[i].indexOf("%") === parts[i].length - 1 ? f(i) / 100 : f(i) / 255; };
                        out = [ch(0), ch(1), ch(2)];
                    } else {
                        var hh = (((f(0) % 360) + 360) % 360) / 360;
                        var ss = f(1) / 100;
                        var ll = f(2) / 100;
                        var q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
                        var p = 2 * ll - q;
                        var hue = function (t) {
                            t = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
                            if (t < 1 / 6) return p + (q - p) * 6 * t;
                            if (t < 1 / 2) return q;
                            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                            return p;
                        };
                        out = [hue(hh + 1 / 3), hue(hh), hue(hh - 1 / 3)];
                    }
                    out = out.map(function (c) { return Math.min(1, Math.max(0, c)); });
                }
            }
        }
        colorCache.set(key, out);
        return out;
    }

    function color(input, fallback) {
        return parseColor(input) || parseColor(fallback);
    }

    function clampN(v, lo, hi) {
        return v < lo ? lo : v > hi ? hi : v;
    }

    function link(gl, frag, label) {
        function shader(type, src) {
            var sh = gl.createShader(type);
            if (!sh) return null;
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error(NAME + " " + label + " shader:", gl.getShaderInfoLog(sh));
                gl.deleteShader(sh);
                return null;
            }
            return sh;
        }
        var vs = shader(gl.VERTEX_SHADER, VERT_SRC);
        var fs = shader(gl.FRAGMENT_SHADER, frag);
        if (!vs || !fs) return null;
        var prog = gl.createProgram();
        if (!prog) return null;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error(NAME + " " + label + " link:", gl.getProgramInfoLog(prog));
            gl.deleteProgram(prog);
            return null;
        }
        return prog;
    }

    function locations(gl, prog, names) {
        var out = {};
        for (var i = 0; i < names.length; i++) out[names[i]] = gl.getUniformLocation(prog, names[i]);
        return out;
    }

    function fieldTarget(gl) {
        var fbo = gl.createFramebuffer();
        var tex = null;
        var w = 0;
        var h = 0;
        var half = !!gl.getExtension("EXT_color_buffer_float");
        return {
            fbo: fbo,
            texture: function () { return tex; },
            width: function () { return w; },
            height: function () { return h; },
            resize: function (nw, nh) {
                if (nw === w && nh === h && tex) return;
                for (var attempt = 0; attempt < 2; attempt++) {
                    if (tex) gl.deleteTexture(tex);
                    tex = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGBA16F : gl.RGBA8, nw, nh, 0, gl.RGBA, half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
                    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                    if (ok || !half) break;
                    half = false;
                }
                w = nw;
                h = nh;
            },
            dispose: function () {
                if (tex) gl.deleteTexture(tex);
                gl.deleteFramebuffer(fbo);
            },
        };
    }

    function trackPointer(root) {
        var p = { tx: 0, ty: 0, inside: false };
        function read(e) {
            var r = root.getBoundingClientRect();
            var sx = root.offsetWidth / (r.width || 1);
            var sy = root.offsetHeight / (r.height || 1);
            p.tx = (e.clientX - r.left) * sx;
            p.ty = (e.clientY - r.top) * sy;
            p.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        }
        function out(e) {
            if (!e.relatedTarget) p.inside = false;
        }
        window.addEventListener("pointermove", read, { passive: true });
        window.addEventListener("pointerdown", read, { passive: true });
        document.addEventListener("pointerout", out);
        return {
            p: p,
            dispose: function () {
                window.removeEventListener("pointermove", read);
                window.removeEventListener("pointerdown", read);
                document.removeEventListener("pointerout", out);
            },
        };
    }

    var DEFAULTS = { background: "#0B0A10", color1: "#2FD3F2", color2: "#7B61FF" };

    function themeColors() {
        var cs = getComputedStyle(document.documentElement);
        return {
            background: cs.getPropertyValue("--color-global-bg").trim() || DEFAULTS.background,
            color1: cs.getPropertyValue("--color-primary").trim() || DEFAULTS.color1,
            color2: cs.getPropertyValue("--color-primary-light").trim() || DEFAULTS.color2,
        };
    }

    function init() {
        // Respect reduced-motion: skip the WebGL background entirely and let the
        // existing CSS theme background (--color-global-bg/-gradient) show instead.
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        var root = document.createElement("div");
        root.id = "ribbon-glow-bg";
        var canvas = document.createElement("canvas");
        root.appendChild(canvas);
        document.body.insertBefore(root, document.body.firstChild);

        var gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false });
        if (!gl) {
            console.error(NAME + ": WebGL2 unavailable");
            root.remove();
            return;
        }
        var field = link(gl, FIELD_SRC, "field");
        var finish = link(gl, FINISH_SRC, "finish");
        if (!field || !finish) {
            root.remove();
            return;
        }
        var uf = locations(gl, field, ["uRes", "uTime", "uC1", "uC2", "uSize", "uAngle", "uMouse", "uOn", "uReach", "uVel"]);
        var un = locations(gl, finish, ["uField", "uRes", "uTime", "uBg", "uPaper"]);
        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        var target = fieldTarget(gl);
        var pointer = trackPointer(root);
        var ptr = pointer.p;

        var c1 = color(DEFAULTS.color1, DEFAULTS.color1);
        var c2 = color(DEFAULTS.color2, DEFAULTS.color2);
        var bg = color(DEFAULTS.background, DEFAULTS.background);
        var bgLum = 0;

        function updateColors() {
            var v = themeColors();
            c1 = color(v.color1, DEFAULTS.color1);
            c2 = color(v.color2, DEFAULTS.color2);
            bg = color(v.background, DEFAULTS.background);
            bgLum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
        }
        updateColors();

        var themeObserver = new MutationObserver(updateColors);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        var mx = 0, my = 0, vx = 0, vy = 0, on = 0;
        var raf = 0;
        var last = -1;
        var clock = 0;
        var paused = document.hidden;

        function frame(now) {
            raf = requestAnimationFrame(frame);
            var dt = last < 0 ? 0 : clampN((now - last) / 1000, 0, 0.05);
            last = now;
            clock = (clock + dt * CFG.speed) % 3600;

            var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            var cw = canvas.clientWidth || window.innerWidth || 1200;
            var ch = canvas.clientHeight || window.innerHeight || 800;
            var bw = Math.max(1, Math.round(cw * dpr));
            var bh = Math.max(1, Math.round(ch * dpr));
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw;
                canvas.height = bh;
            }
            target.resize(Math.max(1, Math.round(bw / 2)), Math.max(1, Math.round(bh / 2)));

            var present = ptr.inside ? 1 : 0;
            if (present && on < 0.02) {
                mx = ptr.tx;
                my = ptr.ty;
            }
            on += (present - on) * (1 - Math.exp(-dt * 5));
            var k = 1 - Math.exp(-dt * 16);
            var nx = mx + (ptr.tx - mx) * k;
            var ny = my + (ptr.ty - my) * k;
            if (dt > 0) {
                var kv = 1 - Math.exp(-dt * 8);
                vx += ((nx - mx) / dt - vx) * kv;
                vy += ((ny - my) / dt - vy) * kv;
            }
            mx = nx;
            my = ny;
            var vLen = Math.hypot(vx, vy) / ch;
            var vCap = vLen > 3 ? 3 / vLen : 1;

            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
            gl.viewport(0, 0, target.width(), target.height());
            gl.useProgram(field);
            gl.uniform2f(uf.uRes, target.width(), target.height());
            gl.uniform1f(uf.uTime, clock);
            gl.uniform3f(uf.uC1, c1[0], c1[1], c1[2]);
            gl.uniform3f(uf.uC2, c2[0], c2[1], c2[2]);
            gl.uniform1f(uf.uSize, CFG.size);
            gl.uniform1f(uf.uAngle, CFG.angle);
            gl.uniform2f(uf.uMouse, (mx - cw / 2) / ch, (ch / 2 - my) / ch);
            gl.uniform1f(uf.uOn, on * CFG.hover);
            gl.uniform1f(uf.uReach, CFG.reach / ch);
            gl.uniform2f(uf.uVel, (vx / ch) * vCap, (-vy / ch) * vCap);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, bw, bh);
            gl.useProgram(finish);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, target.texture());
            gl.uniform1i(un.uField, 0);
            gl.uniform2f(un.uRes, bw, bh);
            gl.uniform1f(un.uTime, clock);
            gl.uniform3f(un.uBg, bg[0], bg[1], bg[2]);
            gl.uniform1f(un.uPaper, clampN((bgLum - 0.35) / 0.3, 0, 1));
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        raf = requestAnimationFrame(frame);
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) {
                if (!paused) cancelAnimationFrame(raf);
                paused = true;
            } else if (paused) {
                paused = false;
                last = -1;
                raf = requestAnimationFrame(frame);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
