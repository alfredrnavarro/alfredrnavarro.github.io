// Theme management: night (dark, the default) and parchment (light)
class ThemeManager {
    constructor() {
        const saved = localStorage.getItem('theme');
        // Anyone who had the old neural-link themes saved lands on the matching mode
        this.dark = saved !== 'light' && saved !== 'cyber-light';
        this.init();
    }

    get theme() {
        return this.dark ? 'dark' : 'light';
    }

    init() {
        this.apply();

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleMode());
        }
    }

    apply() {
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);

        // The sun/moon button always offers the opposite of the current mode
        const nextMode = this.dark ? 'light' : 'dark';
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.setAttribute('aria-label', `Switch to ${nextMode} theme`);
            const sun = themeToggle.querySelector('.sun-icon');
            const moon = themeToggle.querySelector('.moon-icon');
            if (sun && moon) {
                sun.style.display = nextMode === 'light' ? 'block' : 'none';
                moon.style.display = nextMode === 'dark' ? 'block' : 'none';
            }
        }
    }

    toggleMode() {
        this.dark = !this.dark;
        this.apply();
    }
}

// Mobile navigation management
class MobileNavigation {
    constructor() {
        this.menuOpen = false;
        this.toggleTime = 0;
        this.init();
    }

    init() {
        const mobileButton = document.getElementById('toggle-navigation-menu');
        const header = document.getElementById('main-header');

        if (mobileButton && header) {
            // Use both click and touchend for reliable mobile response
            mobileButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu(header, mobileButton);
            });
        }

        // Close menu when clicking on navigation links (mobile)
        const navLinks = document.querySelectorAll('#navigation-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (this.menuOpen && header && mobileButton) {
                    this.toggleMenu(header, mobileButton);
                }
            });
        });

        // Close menu when clicking/tapping outside
        document.addEventListener('click', (e) => {
            // Guard: ignore if menu was just toggled (prevents open-then-immediately-close)
            if (Date.now() - this.toggleTime < 300) return;
            if (this.menuOpen &&
                !e.target.closest('#main-header') &&
                !e.target.closest('#navigation-menu') &&
                header && mobileButton) {
                this.toggleMenu(header, mobileButton);
            }
        });

        // Handle escape key to close menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuOpen && header && mobileButton) {
                this.toggleMenu(header, mobileButton);
            }
        });
    }

    toggleMenu(header, button) {
        this.menuOpen = !this.menuOpen;
        this.toggleTime = Date.now();

        if (this.menuOpen) {
            header.classList.add('menu-open');
            document.body.classList.add('menu-open');
        } else {
            header.classList.remove('menu-open');
            document.body.classList.remove('menu-open');
        }

        button.setAttribute('aria-expanded', this.menuOpen.toString());
    }
}

// Smooth scrolling for navigation links
class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        // Handle navigation link clicks
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Compute dynamic offset based on actual header height
                    const header = document.getElementById('main-header');
                    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
                    const extraMargin = 8; // small breathing room below the header
                    const targetRect = targetElement.getBoundingClientRect();
                    const targetPosition = window.pageYOffset + targetRect.top - (headerHeight + extraMargin);
                    
                    // Immediately update active state for better UX
                    const sectionId = targetId.substring(1);
                    const navigationHighlight = window.navigationHighlightInstance;
                    if (navigationHighlight) {
                        navigationHighlight.highlightNavLink(sectionId);
                    }
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update URL without triggering scroll
                    history.pushState(null, null, targetId);
                }
            });
        });
    }
}

// Active navigation link highlighting
class NavigationHighlight {
    constructor() {
        this.sections = [];
        this.navLinks = [];
        this.init();
    }

    init() {
        // Get all sections and navigation links
        this.sections = document.querySelectorAll('section[id]');
        this.navLinks = document.querySelectorAll('#navigation-menu a[href^="#"]');
        
        if (this.sections.length > 0 && this.navLinks.length > 0) {
            // Set initial active state based on URL hash only
            this.setInitialActiveState();
            
            // Handle hash changes (but no scroll-based highlighting)
            window.addEventListener('hashchange', () => {
                this.handleHashChange();
            });
        }
    }

    setInitialActiveState() {
        const hash = window.location.hash;
        if (hash && hash !== '#') {
            const targetId = hash.substring(1);
            this.highlightNavLink(targetId);
        }
        // No default active state - only highlight when there's a hash in URL
    }

    handleHashChange() {
        const hash = window.location.hash;
        if (hash && hash !== '#') {
            const targetId = hash.substring(1);
            this.highlightNavLink(targetId);
        } else {
            // Clear all active states when there's no hash
            this.clearAllActiveStates();
        }
    }

    highlightNavLink(activeId) {
        // Remove active class from all links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });

        // Add active class to current link
        const activeLink = document.querySelector(`#navigation-menu a[href="#${activeId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            activeLink.setAttribute('aria-current', 'page');
        }
    }

    // Method to clear all active states (useful for debugging)
    clearAllActiveStates() {
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });
    }
}

// Performance optimization: Lazy load images if any are added
class LazyImageLoader {
    constructor() {
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }
}

// Markdown content loader
class MarkdownLoader {
    constructor() {
        this.sections = ['about', 'news', 'publications', 'resume'];
        this.init();
    }

    init() {
        // Load all markdown sections
        this.sections.forEach(section => {
            this.loadMarkdown(section);
        });
    }

    async loadMarkdown(section) {
        const contentElement = document.getElementById(`${section}-content`);
        if (!contentElement) return;

        // Try multiple path strategies for better compatibility
        const pathsToTry = [
            `./${section}.md`,           // Relative to current directory
            `${section}.md`,             // Direct relative path
            `/${section}.md`             // Absolute from root (for some GitHub Pages setups)
        ];

        let lastError = null;
        
        for (const fullPath of pathsToTry) {
            try {
                console.log(`Trying to fetch: ${fullPath}`);
                const response = await fetch(fullPath);
                if (response.ok) {
                    const markdown = await response.text();
                    const html = this.parseMarkdown(markdown);
                    contentElement.innerHTML = html;
                    // Apply hover effect to new content
                    if (typeof window.applyBHoverEffect === 'function') {
                        window.applyBHoverEffect(contentElement);
                    }
                    console.log(`Successfully loaded ${section} from: ${fullPath}`);
                    return; // Success, exit early
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                console.warn(`Failed to load ${section} from ${fullPath}:`, error.message);
                lastError = error;
                // Continue to next path
            }
        }

        // If we get here, all paths failed
        console.error(`Error loading ${section} content - all paths failed:`, lastError);
        console.log(`Current location: ${window.location.href}`);
        contentElement.innerHTML = `
            <div class="error-message">
                <p>Sorry, unable to load ${section} content at this time.</p>
                <p><small>Last error: ${lastError?.message || 'Unknown error'}</small></p>
                <p><small>Tried paths: ${pathsToTry.join(', ')}</small></p>
            </div>
        `;
        // Apply hover effect to error content
        if (typeof window.applyBHoverEffect === 'function') {
            window.applyBHoverEffect(contentElement);
        }
    }

    parseMarkdown(markdown) {
        let html = markdown;

        // Convert headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2 class="title">$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1 class="title">$1</h1>');

        // Convert bold text
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Convert italic text
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Convert links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="cactus-link">$1</a>');

        // Convert unordered lists - wrap consecutive <li> elements in <ul>
        html = html.replace(/^\s*- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

        // Convert paragraphs (split by double newlines)
        const paragraphs = html.split(/\n\s*\n/);
        html = paragraphs.map(p => {
            p = p.trim();
            if (!p) return '';
            
            // Skip if already wrapped in HTML tags
            if (p.startsWith('<') && p.endsWith('>')) return p;
            if (p.includes('<li>') || p.includes('<h') || p.includes('<ul>') || p.includes('<div')) return p;
            
            return `<p>${p}</p>`;
        }).join('\n\n');

        // Clean up nested tags
        html = html.replace(/<ul>\s*(<li>.*?<\/li>)\s*<\/ul>/gs, '<ul>$1</ul>');
        html = html.replace(/<li><\/li>/g, '');

        // Convert horizontal rules
        html = html.replace(/^---$/gm, '<hr>');

        return html;
    }
}

// applyBHoverEffect disabled
window.applyBHoverEffect = function() {};

// Mobile card expand/collapse
class MobileCardExpander {
    constructor() {
        this.mql = window.matchMedia('(max-width: 640px)');
        this.init();
    }

    init() {
        const cards = document.querySelectorAll('.project-card, .news-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!this.mql.matches) return;
                // If expanded and clicking a link, let the link work
                if (card.classList.contains('expanded') && e.target.closest('a')) return;
                e.preventDefault();
                card.classList.toggle('expanded');
            });
        });

        this.mql.addEventListener('change', () => {
            if (!this.mql.matches) {
                document.querySelectorAll('.expanded').forEach(el => el.classList.remove('expanded'));
            }
        });
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    new ThemeManager();
    new MobileNavigation();
    new SmoothScroll();
    
    // Make NavigationHighlight available globally for smooth scroll integration
    window.navigationHighlightInstance = new NavigationHighlight();
    
    new LazyImageLoader();
    new MarkdownLoader();
    new MobileCardExpander();
    
    // Apply hover effect to all 'b' letters on initial content
    if (typeof window.applyBHoverEffect === 'function') {
        window.applyBHoverEffect(document.body);
    }

    
    // Add loading state management
    document.body.classList.add('loaded');
    
    // Console message for developers
    console.log('🌵 Portfolio site loaded successfully!');
    console.log('🎉 Click the logo for a party surprise!');
    console.log('Built with inspiration from astro-theme-cactus');
});

// Handle page visibility changes (pause animations when not visible)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        document.body.classList.add('paused');
    } else {
        document.body.classList.remove('paused');
    }
});

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // Handle keyboard navigation for theme toggle
    if (e.key === 't' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.click();
        }
    }
});

// Add reduced motion support
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
    document.documentElement.style.setProperty('scroll-behavior', 'auto');
}

// Listen for changes in motion preference
prefersReducedMotion.addEventListener('change', () => {
    if (prefersReducedMotion.matches) {
        document.documentElement.style.setProperty('scroll-behavior', 'auto');
    } else {
        document.documentElement.style.setProperty('scroll-behavior', 'smooth');
    }
});


// Occult side rails: an astrolabe, a column of planetary glyphs and a
// candle down each edge of the page. Purely decorative; CSS only shows
// them on screens wide enough to have empty margins.
(function buildSideRails() {
    const ticks = [];
    for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const r2 = i % 3 === 0 ? 39 : 42.5;
        ticks.push(`M${(50 + 46 * Math.cos(a)).toFixed(2)} ${(50 + 46 * Math.sin(a)).toFixed(2)}L${(50 + r2 * Math.cos(a)).toFixed(2)} ${(50 + r2 * Math.sin(a)).toFixed(2)}`);
    }

    const astrolabe = `
        <svg class="rail-astrolabe" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <g class="rail-wheel">
                <circle cx="50" cy="50" r="48" stroke-width="0.8"/>
                <circle cx="50" cy="50" r="46" stroke-width="0.4"/>
                <path d="${ticks.join('')}" stroke-width="0.6"/>
                <circle cx="50" cy="50" r="36" stroke-width="0.5"/>
            </g>
            <g class="rail-rete">
                <circle cx="50" cy="50" r="27" stroke-width="0.5" stroke-dasharray="1.5 2.5"/>
                <rect x="31" y="31" width="38" height="38" stroke-width="0.6"/>
                <rect x="31" y="31" width="38" height="38" stroke-width="0.6" transform="rotate(45 50 50)"/>
                <circle cx="50" cy="50" r="9" stroke-width="0.6"/>
                <path d="M50 4v12M50 84v12M4 50h12M84 50h12" stroke-width="0.6"/>
            </g>
            <circle cx="50" cy="50" r="2" fill="currentColor" stroke="none"/>
        </svg>`;

    const candle = (id) => `
        <svg class="rail-candle" viewBox="0 0 40 110" fill="none">
            <defs>
                <radialGradient id="${id}">
                    <stop offset="0%" stop-color="#ffd890" stop-opacity="0.55"/>
                    <stop offset="100%" stop-color="#ffb347" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <circle class="rail-candle-glow" cx="20" cy="30" r="20" fill="url(#${id})"/>
            <g class="rail-flame">
                <path d="M20 18c3 5 5 8 5 12a5 5 0 0 1-10 0c0-4 2-7 5-12z" fill="#f2b04e"/>
                <path d="M20 25c1.6 2.6 2.5 4 2.5 6a2.5 2.5 0 0 1-5 0c0-2 .9-3.4 2.5-6z" fill="#fff1c6"/>
            </g>
            <path d="M20 36v4" stroke="#2b2116" stroke-width="1"/>
            <path d="M14 40h12v52H14z" fill="#d8c8a2"/>
            <path d="M14 40h12v6c-1.5 0-1.5 5-3 5s-1-3-2.5-3-1 7-3 7-1.5-6-3.5-6z" fill="#efe4c8"/>
            <path d="M14 40v52" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
            <path d="M6 94h28l-3 5H9z" fill="currentColor" opacity="0.85"/>
            <ellipse cx="20" cy="99.5" rx="13" ry="2" fill="currentColor" opacity="0.6"/>
            <path d="M34 95c4 0 4 6 0 6" stroke="currentColor" stroke-width="1.2"/>
        </svg>`;

    // Text presentation selector keeps the glyphs from turning into emoji
    const glyphs = (list) => list
        .map((g) => `<span class="rail-seg"></span><span class="rail-glyph">${g}︎</span>`)
        .join('') + '<span class="rail-seg"></span>';

    const rails = [
        ['side-rail-left', ['☉', '☽', '☿', '♀', '♂'], 'rail-glow-l'],
        ['side-rail-right', ['♃', '♄', '♅', '♆', '☄'], 'rail-glow-r'],
    ];

    rails.forEach(([cls, list, glowId]) => {
        const rail = document.createElement('div');
        rail.className = `side-rail ${cls}`;
        rail.setAttribute('aria-hidden', 'true');
        rail.innerHTML = astrolabe + `<div class="rail-column">${glyphs(list)}</div>` + candle(glowId);
        document.body.appendChild(rail);
    });
})();

// Occult cursor: a small spinning sigil on the pointer, a lamplight halo
// that trails it, brass embers shed as it moves, and a green pulse with
// sparks and a rising planetary glyph on click. Particles live on one
// fixed canvas whose loop only runs while something is still moving.
// Mouse and trackpad only; skipped for touch and reduced motion.
(function occultCursor() {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || still) return;

    const halo = document.createElement('div');
    halo.id = 'cursor-glow';
    const sigil = document.createElement('div');
    sigil.className = 'cursor-sigil';
    sigil.innerHTML = `
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor">
            <g class="cursor-sigil-outer">
                <circle cx="20" cy="20" r="17" stroke-width="1" stroke-dasharray="2 2.6"/>
                <path d="M20 0.5v5M20 34.5v5M0.5 20h5M34.5 20h5" stroke-width="1.2"/>
            </g>
            <g class="cursor-sigil-inner">
                <circle cx="20" cy="20" r="11" stroke-width="0.8"/>
                <path d="M20 12.5 26.5 23.75H13.5Z" stroke-width="0.9" stroke-linejoin="round"/>
            </g>
            <circle cx="20" cy="20" r="1.6" fill="currentColor" stroke="none"/>
        </svg>`;
    const canvas = document.createElement('canvas');
    canvas.className = 'cursor-embers';
    [halo, sigil, canvas].forEach((el) => el.setAttribute('aria-hidden', 'true'));
    document.body.append(canvas, halo, sigil);

    const ctx = canvas.getContext('2d');
    let dpr = 1, w = 0, h = 0;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const CLICKABLE = 'a, button, [role="button"], input, select, textarea, label, summary, .carousel-friend, #round-carousel';
    const GLYPHS = ['☉', '☽', '☿', '♀', '♂', '♃', '♄'];
    const MAX = 220;

    let x = -400, y = -400;   // pointer
    let hx = x, hy = y;       // halo, eased toward the pointer
    let lastX = null, lastY = null;
    let raf = 0;
    let prev = 0;
    const embers = [];
    const pulses = [];
    const glyphs = [];

    const light = () => document.documentElement.getAttribute('data-theme') === 'light' &&
        !document.body.classList.contains('has-hero');

    function spawnEmber(px, py, green) {
        if (embers.length >= MAX) embers.shift();
        const a = Math.random() * Math.PI * 2;
        const s = green ? 1.2 + Math.random() * 3.2 : 0.2 + Math.random() * 0.9;
        const jitter = green ? 0 : 10;   // loose sparks, not a dotted line
        embers.push({
            x: px + (Math.random() - 0.5) * jitter,
            y: py + (Math.random() - 0.5) * jitter,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s - (green ? 0.6 : 0.35),
            life: 0, max: green ? 0.55 + Math.random() * 0.4 : 0.6 + Math.random() * 0.6,
            r: green ? 1 + Math.random() * 1.4 : 0.7 + Math.random() * 1.3,
            green,
        });
    }

    function start() {
        if (!raf) {
            prev = performance.now();
            raf = requestAnimationFrame(frame);
        }
    }

    function frame(now) {
        const dt = Math.min((now - prev) / 1000, 0.05);
        prev = now;
        const k = dt * 60;   // frame-rate independent step

        hx += (x - hx) * Math.min(0.16 * k, 1);
        hy += (y - hy) * Math.min(0.16 * k, 1);
        halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;

        ctx.clearRect(0, 0, w, h);
        const onLight = light();
        ctx.globalCompositeOperation = onLight ? 'source-over' : 'lighter';

        for (let i = embers.length - 1; i >= 0; i--) {
            const p = embers[i];
            p.life += dt;
            const t = p.life / p.max;
            if (t >= 1) { embers.splice(i, 1); continue; }
            p.vx *= Math.pow(0.95, k);
            p.vy = p.vy * Math.pow(0.95, k) - 0.035 * k;  // embers rise
            p.x += p.vx * k;
            p.y += p.vy * k;
            const alpha = (1 - t) * (1 - t * 0.4);
            const col = p.green
                ? `hsla(135, 100%, ${onLight ? 32 : 66}%, `
                : (onLight ? 'rgba(130, 92, 30, ' : `hsla(${38 + t * 8}, 85%, ${70 - t * 25}%, `);
            ctx.fillStyle = col + (alpha * 0.22) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = col + alpha + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            p.life += dt;
            const t = p.life / 0.55;
            if (t >= 1) { pulses.splice(i, 1); continue; }
            const ease = 1 - Math.pow(1 - t, 3);
            ctx.strokeStyle = `hsla(135, 100%, ${onLight ? 30 : 65}%, ${(1 - t) * 0.85})`;
            ctx.lineWidth = 1.5 * (1 - t) + 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6 + ease * 34, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4 + ease * 52, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = glyphs.length - 1; i >= 0; i--) {
            const g = glyphs[i];
            g.life += dt;
            const t = g.life / 1.1;
            if (t >= 1) { glyphs.splice(i, 1); continue; }
            const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
            ctx.font = `${16 + t * 6}px 'Segoe UI Symbol', 'Noto Sans Symbols', 'Apple Symbols', serif`;
            ctx.fillStyle = `hsla(135, 100%, ${onLight ? 28 : 70}%, ${alpha * 0.9})`;
            ctx.fillText(g.ch, g.x + Math.sin(t * 5) * 4, g.y - t * 46);
        }

        const settling = Math.abs(x - hx) + Math.abs(y - hy) > 0.5;
        if (embers.length || pulses.length || glyphs.length || settling) {
            raf = requestAnimationFrame(frame);
        } else {
            ctx.clearRect(0, 0, w, h);
            raf = 0;
        }
    }

    window.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        x = e.clientX;
        y = e.clientY;
        sigil.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        halo.classList.add('is-visible');
        sigil.classList.add('is-visible');

        // Embers in proportion to distance travelled, along the path
        if (lastX !== null) {
            const dist = Math.hypot(x - lastX, y - lastY);
            const n = Math.min(Math.floor(dist / 9 + Math.random() * 1.5), 4);
            for (let i = 1; i <= n; i++) {
                const f = (i - Math.random()) / n;
                spawnEmber(lastX + (x - lastX) * f, lastY + (y - lastY) * f, false);
            }
        }
        lastX = x;
        lastY = y;
        start();
    }, { passive: true });

    document.addEventListener('pointerover', (e) => {
        const hot = !!(e.target.closest && e.target.closest(CLICKABLE));
        sigil.classList.toggle('is-hovering', hot);
        halo.classList.toggle('is-hovering', hot);
    });

    document.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        sigil.classList.add('is-pressed');
        pulses.push({ x: e.clientX, y: e.clientY, life: 0 });
        for (let i = 0; i < 14; i++) spawnEmber(e.clientX, e.clientY, true);
        glyphs.push({ x: e.clientX, y: e.clientY - 14, life: 0, ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] });
        start();
    });
    document.addEventListener('pointerup', () => sigil.classList.remove('is-pressed'));

    // Fade out when the pointer leaves the window
    document.documentElement.addEventListener('pointerleave', () => {
        halo.classList.remove('is-visible');
        sigil.classList.remove('is-visible');
        lastX = lastY = null;
    });
})();
