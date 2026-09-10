// Theme management
// Two independent axes: light/dark, and normal/neural-link. The sun-moon
// button flips the first, the chip flips the second, so each of the four
// combinations is reachable and neither button undoes the other.
class ThemeManager {
    constructor() {
        const saved = localStorage.getItem('theme');
        const theme = ['light', 'dark', 'cyber', 'cyber-light'].includes(saved) ? saved : 'light';
        this.dark = theme === 'dark' || theme === 'cyber';
        this.cyber = theme.indexOf('cyber') === 0;
        this.init();
    }

    get theme() {
        if (this.cyber) return this.dark ? 'cyber' : 'cyber-light';
        return this.dark ? 'dark' : 'light';
    }

    init() {
        this.apply();

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleMode());
        }

        const cyberToggle = document.getElementById('cyber-toggle');
        if (cyberToggle) {
            cyberToggle.addEventListener('click', () => this.toggleCyber());
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

        const cyberToggle = document.getElementById('cyber-toggle');
        if (cyberToggle) {
            cyberToggle.setAttribute('aria-pressed', this.cyber.toString());
            cyberToggle.setAttribute('aria-label',
                this.cyber ? 'Deactivate neural link theme' : 'Activate neural link theme');
        }
    }

    toggleMode() {
        this.dark = !this.dark;
        this.apply();
    }

    toggleCyber() {
        this.cyber = !this.cyber;
        this.apply();
        if (this.cyber) this.playGlitch();
    }

    playGlitch() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (document.querySelector('.cyber-glitch')) return;

        const neons = ['#00e5ff', '#b14aff', '#ff2bd6', '#6c4cff', '#fcee0a'];
        const overlay = document.createElement('div');
        overlay.className = 'cyber-glitch';

        // Bands at pseudo-random heights, each slammed a different distance
        for (let i = 0; i < 7; i++) {
            const slice = document.createElement('div');
            slice.className = 'cyber-glitch-slice';
            const dir = i % 2 === 0 ? 1 : -1;
            slice.style.setProperty('--top', `${4 + i * 13 + Math.random() * 6}%`);
            slice.style.setProperty('--h', `${2 + Math.random() * 7}%`);
            slice.style.setProperty('--dx', `${dir * (18 + Math.random() * 45)}px`);
            slice.style.setProperty('--c', neons[i % neons.length]);
            slice.style.setProperty('--delay', `${Math.random() * 90}ms`);
            overlay.appendChild(slice);
        }

        const dots = document.createElement('div');
        dots.className = 'cyber-glitch-dots';
        const wipe = document.createElement('div');
        wipe.className = 'cyber-glitch-wipe';
        overlay.append(dots, wipe);

        document.body.classList.add('cyber-glitching');
        document.body.appendChild(overlay);

        window.setTimeout(() => {
            overlay.remove();
            document.body.classList.remove('cyber-glitching');
        }, 780);
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

    // Replace header inline SVG logo with favicon image (no HTML edit required)
    (function replaceHeaderSvgWithFavicon() {
        try {
            const logoSvgEl = document.querySelector('.header-logo svg');
            if (logoSvgEl && logoSvgEl.parentNode) {
                const img = document.createElement('img');
                img.src = 'assets/favicon.ico';
                img.alt = 'A Navarro logo';
                img.style.width = '2.5rem';
                img.style.height = '2.5rem';
                img.style.borderRadius = '0.5rem';
                logoSvgEl.parentNode.replaceChild(img, logoSvgEl);
            }
        } catch (e) {
            // Fail silently if replacement not possible
            console.warn('Logo replacement failed:', e);
        }
    })();
    
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

// ===================================
// Floating Icons 3D Extrusion
// ===================================
class FloatingIcons3D {
    constructor() {
        this.layerCount = 8;
        this.layerSpacing = 2; // px between layers
        this.init();
    }

    init() {
        const icons = document.querySelectorAll('.floating-icon');
        icons.forEach(icon => this.extrudeIcon(icon));
    }

    extrudeIcon(iconEl) {
        const svg = iconEl.querySelector(':scope > svg');
        if (!svg) return;

        const theme = document.documentElement.getAttribute('data-theme');
        const isCyber = theme === 'cyber' || theme === 'cyber-light';
        const baseColor = theme === 'cyber'
            ? { r: 0, g: 229, b: 255 }
            : theme === 'cyber-light'
                ? { r: 0, g: 137, b: 168 }
                : theme === 'dark'
                    ? { r: 185, g: 190, b: 200 }
                    : { r: 210, g: 215, b: 220 };

        // The CSS glow uses currentColor, so the front face carries the neon
        svg.style.color = isCyber
            ? `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`
            : '';

        const totalDepth = this.layerCount * this.layerSpacing;
        const halfDepth = totalDepth / 2;

        svg.style.transform = `translateZ(${halfDepth}px)`;

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < this.layerCount; i++) {
            const layer = document.createElement('div');
            layer.className = 'extrusion-layer';

            const clonedSvg = svg.cloneNode(true);
            clonedSvg.style.transform = '';

            // Darken layers toward the middle for shading
            const distFromEdge = Math.min(i, this.layerCount - 1 - i);
            const darkenFactor = 1 - ((1 - distFromEdge / (this.layerCount / 2)) * 0.35);
            const r = Math.round(baseColor.r * darkenFactor);
            const g = Math.round(baseColor.g * darkenFactor);
            const b = Math.round(baseColor.b * darkenFactor);

            clonedSvg.style.color = `rgb(${r}, ${g}, ${b})`;
            clonedSvg.style.filter = 'none';

            const z = halfDepth - (i * this.layerSpacing);
            layer.style.transform = `translateZ(${z}px)`;
            layer.appendChild(clonedSvg);

            fragment.appendChild(layer);
        }

        iconEl.insertBefore(fragment, svg);
    }
}

// Update extrusion colors on theme change
function updateExtrusionTheme() {
    document.querySelectorAll('.floating-icon').forEach(icon => {
        icon.querySelectorAll('.extrusion-layer').forEach(l => l.remove());
        // Reset front SVG transform so extrudeIcon can reapply it
        const svg = icon.querySelector(':scope > svg');
        if (svg) svg.style.transform = '';
    });
    new FloatingIcons3D();
}

document.addEventListener('DOMContentLoaded', () => {
    new FloatingIcons3D();

    // Listen for theme changes
    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.attributeName === 'data-theme') {
                updateExtrusionTheme();
                break;
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});
