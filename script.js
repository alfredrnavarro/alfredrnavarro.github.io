// Theme management
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // Set initial theme
        this.setTheme(this.theme);
        
        // Add event listener to theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    setTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update theme toggle button aria-label
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.setAttribute('aria-label', 
                theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            );
            // Update icon visibility explicitly to avoid any flash
            const sun = themeToggle.querySelector('.sun-icon');
            const moon = themeToggle.querySelector('.moon-icon');
            if (sun && moon) {
                if (theme === 'dark') {
                    sun.style.display = 'block';
                    moon.style.display = 'none';
                } else {
                    sun.style.display = 'none';
                    moon.style.display = 'block';
                }
            }
        }
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
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

// Hover effect for letter 'b' and 'B'
(function() {
    function applyBHoverEffect(root) {
        const targetRoot = root || document.body;
        if (!targetRoot) return;

        const walker = document.createTreeWalker(
            targetRoot,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const value = node.nodeValue;
                    if (!value || (value.indexOf('b') === -1 && value.indexOf('B') === -1)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    const parent = node.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    const tag = parent.nodeName;
                    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (parent.classList && parent.classList.contains('hover-b')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodesToProcess = [];
        let current;
        while ((current = walker.nextNode())) {
            nodesToProcess.push(current);
        }

        nodesToProcess.forEach((textNode) => {
            const text = textNode.nodeValue;
            const fragment = document.createDocumentFragment();
            let buffer = '';

            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (ch === 'b' || ch === 'B') {
                    if (buffer) {
                        fragment.appendChild(document.createTextNode(buffer));
                        buffer = '';
                    }
                    const span = document.createElement('span');
                    span.className = 'hover-b';
                    span.textContent = ch;
                    fragment.appendChild(span);
                } else {
                    buffer += ch;
                }
            }

            if (buffer) {
                fragment.appendChild(document.createTextNode(buffer));
            }

            if (textNode.parentNode) {
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        });
    }

    window.applyBHoverEffect = applyBHoverEffect;
})();

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
    
    // Apply hover effect to all 'b' letters on initial content
    if (typeof window.applyBHoverEffect === 'function') {
        window.applyBHoverEffect(document.body);
    }

    // Replace header inline SVG with favicon image (no HTML edit required)
    (function replaceHeaderSvgWithFavicon() {
        try {
            const logoSvgEl = document.querySelector('#main-header svg');
            if (logoSvgEl && logoSvgEl.parentNode) {
                const img = document.createElement('img');
                img.src = 'assets/favicon.ico';
                img.alt = 'A Navarro logo';
                img.className = logoSvgEl.getAttribute('class') || 'me-3 h-10 w-6 sm:me-3 sm:h-20 sm:w-12';
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
// Upside Down Mode (Grandfather Clock)
// ===================================
class UpsideDownMode {
    constructor() {
        this.isActive = false;
        this.portalContainer = null;
        this.overlay = null;
        this.spores = [];
        this.embers = [];
        this.init();
    }

    init() {
        const clockButton = document.getElementById('grandfather-clock');
        if (clockButton) {
            clockButton.addEventListener('click', () => this.toggle());
        }
    }

    toggle() {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    activate() {
        this.isActive = true;
        document.body.classList.add('upside-down-mode');

        // Recolor floating icon extrusions to dark red
        this.recolorExtrusions({ r: 140, g: 30, b: 30 });

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'upside-down-overlay';
        document.body.appendChild(this.overlay);
        
        // Create portal container
        this.portalContainer = document.createElement('div');
        this.portalContainer.className = 'upside-down-portal-container';
        document.body.appendChild(this.portalContainer);
        
        // Create the glowing portal
        this.createPortal();
        
        // Create organic tentacles spreading from portal
        this.createTentacles();
        
        // Create dark edge tentacles
        this.createEdgeTentacles();
        
        // Create floating spores
        this.createSpores();
        
        // Create rising embers
        this.createEmbers();
    }

    deactivate() {
        this.isActive = false;
        document.body.classList.remove('upside-down-mode');

        // Restore floating icon extrusion colors
        updateExtrusionTheme();

        // Remove overlay
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
        
        // Remove portal container
        if (this.portalContainer && this.portalContainer.parentNode) {
            this.portalContainer.parentNode.removeChild(this.portalContainer);
            this.portalContainer = null;
        }
        
        // Remove spores
        this.spores.forEach(spore => {
            if (spore && spore.parentNode) {
                spore.parentNode.removeChild(spore);
            }
        });
        this.spores = [];
        
        // Clear ember interval
        if (this.emberInterval) {
            clearInterval(this.emberInterval);
            this.emberInterval = null;
        }
        
        // Remove remaining embers
        this.embers.forEach(ember => {
            if (ember && ember.parentNode) {
                ember.parentNode.removeChild(ember);
            }
        });
        this.embers = [];
    }

    createPortal() {
        const portal = document.createElement('div');
        portal.className = 'upside-down-portal';
        this.portalContainer.appendChild(portal);
    }

    createTentacles() {
        // Create squiggly tentacles using SVG paths
        const tentacleConfigs = [
            // Top tentacles
            { angle: -90, length: 400, x: 50, y: 50, delay: 0 },
            { angle: -75, length: 350, x: 50, y: 50, delay: 0.2 },
            { angle: -105, length: 380, x: 50, y: 50, delay: 0.1 },
            { angle: -60, length: 320, x: 50, y: 50, delay: 0.4 },
            { angle: -120, length: 340, x: 50, y: 50, delay: 0.3 },
            { angle: -85, length: 300, x: 50, y: 50, delay: 0.5 },
            { angle: -95, length: 310, x: 50, y: 50, delay: 0.45 },
            
            // Bottom tentacles (roots)
            { angle: 90, length: 300, x: 50, y: 50, delay: 0.1 },
            { angle: 75, length: 280, x: 50, y: 50, delay: 0.25 },
            { angle: 105, length: 290, x: 50, y: 50, delay: 0.15 },
            { angle: 60, length: 250, x: 50, y: 50, delay: 0.5 },
            { angle: 120, length: 260, x: 50, y: 50, delay: 0.4 },
            
            // Left tentacles
            { angle: 180, length: 350, x: 50, y: 50, delay: 0.2 },
            { angle: 165, length: 320, x: 50, y: 50, delay: 0.35 },
            { angle: -165, length: 340, x: 50, y: 50, delay: 0.3 },
            { angle: 150, length: 280, x: 50, y: 50, delay: 0.55 },
            { angle: -150, length: 290, x: 50, y: 50, delay: 0.5 },
            
            // Right tentacles
            { angle: 0, length: 360, x: 50, y: 50, delay: 0.15 },
            { angle: 15, length: 330, x: 50, y: 50, delay: 0.3 },
            { angle: -15, length: 320, x: 50, y: 50, delay: 0.35 },
            { angle: 30, length: 270, x: 50, y: 50, delay: 0.6 },
            { angle: -30, length: 280, x: 50, y: 50, delay: 0.55 },
            
            // Diagonal tentacles
            { angle: -45, length: 400, x: 50, y: 50, delay: 0.25 },
            { angle: -135, length: 380, x: 50, y: 50, delay: 0.3 },
            { angle: 45, length: 370, x: 50, y: 50, delay: 0.35 },
            { angle: 135, length: 390, x: 50, y: 50, delay: 0.2 },
        ];

        tentacleConfigs.forEach(config => {
            this.createSquigglyTentacle(config);
        });
    }

    createSquigglyTentacle(config) {
        const tentacle = document.createElement('div');
        tentacle.className = 'portal-tentacle';
        
        // Calculate size based on length
        const size = config.length * 2;
        tentacle.style.width = `${size}px`;
        tentacle.style.height = `${size}px`;
        tentacle.style.left = `calc(${config.x}% - ${size/2}px)`;
        tentacle.style.top = `calc(${config.y}% - ${size/2}px)`;
        
        // Create SVG with squiggly path
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        
        // Generate squiggly path
        const path = this.generateSquigglyPath(size/2, size/2, config.angle, config.length);
        const pathLength = path.getTotalLength ? 1000 : 1000;
        
        // Main tentacle path
        const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mainPath.setAttribute('d', path);
        mainPath.setAttribute('stroke-width', `${8 + Math.random() * 6}`);
        mainPath.style.strokeDasharray = pathLength;
        mainPath.style.strokeDashoffset = pathLength;
        mainPath.style.setProperty('--path-length', pathLength);
        mainPath.style.setProperty('--grow-duration', `${1.5 + Math.random() * 1}s`);
        mainPath.style.animationDelay = `${config.delay}s`;
        
        // Glow path (thicker, blurred)
        const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glowPath.setAttribute('d', path);
        glowPath.setAttribute('class', 'glow');
        glowPath.setAttribute('stroke-width', `${16 + Math.random() * 8}`);
        glowPath.style.strokeDasharray = pathLength;
        glowPath.style.strokeDashoffset = pathLength;
        glowPath.style.setProperty('--path-length', pathLength);
        glowPath.style.setProperty('--grow-duration', `${1.5 + Math.random() * 1}s`);
        glowPath.style.animationDelay = `${config.delay}s`;
        
        svg.appendChild(glowPath);
        svg.appendChild(mainPath);
        
        // Add smaller branch tentacles
        const branchCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < branchCount; i++) {
            const branchAngle = config.angle + (Math.random() - 0.5) * 60;
            const branchLength = config.length * (0.2 + Math.random() * 0.3);
            const startDist = config.length * (0.3 + Math.random() * 0.5);
            
            // Calculate branch start point along main tentacle
            const startX = size/2 + Math.cos(config.angle * Math.PI / 180) * startDist;
            const startY = size/2 + Math.sin(config.angle * Math.PI / 180) * startDist;
            
            const branchPath = this.generateSquigglyPathFromPoint(startX, startY, branchAngle, branchLength);
            
            const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            branch.setAttribute('d', branchPath);
            branch.setAttribute('stroke-width', `${3 + Math.random() * 3}`);
            branch.style.strokeDasharray = pathLength;
            branch.style.strokeDashoffset = pathLength;
            branch.style.setProperty('--path-length', pathLength);
            branch.style.setProperty('--grow-duration', `${2 + Math.random() * 1}s`);
            branch.style.animationDelay = `${config.delay + 0.5 + i * 0.2}s`;
            
            svg.appendChild(branch);
        }
        
        tentacle.appendChild(svg);
        this.portalContainer.appendChild(tentacle);
    }

    generateSquigglyPath(startX, startY, angle, length) {
        const rad = angle * Math.PI / 180;
        const segments = 6 + Math.floor(Math.random() * 4);
        const segmentLength = length / segments;
        
        let path = `M ${startX} ${startY}`;
        let currentX = startX;
        let currentY = startY;
        
        for (let i = 0; i < segments; i++) {
            // Add randomness to direction
            const wobble = (Math.random() - 0.5) * 0.5;
            const segAngle = rad + wobble;
            
            // Calculate control points for curve
            const cp1Dist = segmentLength * 0.5;
            const cp2Dist = segmentLength * 0.8;
            
            const perpAngle = segAngle + Math.PI / 2;
            const curveAmount = (Math.random() - 0.5) * 40;
            
            const cp1X = currentX + Math.cos(segAngle) * cp1Dist + Math.cos(perpAngle) * curveAmount;
            const cp1Y = currentY + Math.sin(segAngle) * cp1Dist + Math.sin(perpAngle) * curveAmount;
            
            const cp2X = currentX + Math.cos(segAngle) * cp2Dist + Math.cos(perpAngle) * curveAmount * 0.5;
            const cp2Y = currentY + Math.sin(segAngle) * cp2Dist + Math.sin(perpAngle) * curveAmount * 0.5;
            
            const endX = currentX + Math.cos(segAngle) * segmentLength;
            const endY = currentY + Math.sin(segAngle) * segmentLength;
            
            path += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
            
            currentX = endX;
            currentY = endY;
        }
        
        return path;
    }

    generateSquigglyPathFromPoint(startX, startY, angle, length) {
        return this.generateSquigglyPath(startX, startY, angle, length);
    }

    createTentacle(config) {
        // Legacy method - now using createSquigglyTentacle
        this.createSquigglyTentacle(config);
    }

    createSpores() {
        const sporeCount = 30;
        
        for (let i = 0; i < sporeCount; i++) {
            const spore = document.createElement('div');
            spore.className = 'upside-down-spore';
            
            // Random position
            spore.style.left = `${Math.random() * 100}%`;
            spore.style.top = `${Math.random() * 100}%`;
            
            // Random size
            const size = 3 + Math.random() * 6;
            spore.style.width = `${size}px`;
            spore.style.height = `${size}px`;
            
            // Random animation
            spore.style.setProperty('--float-duration', `${6 + Math.random() * 6}s`);
            spore.style.animationDelay = `${Math.random() * 8}s`;
            
            document.body.appendChild(spore);
            this.spores.push(spore);
        }
    }

    createEdgeTentacles() {
        // Create dark tentacles along all edges of the screen
        const edges = [
            // Top edge - tentacles hanging down
            { edge: 'top', count: 12 },
            // Bottom edge - tentacles reaching up
            { edge: 'bottom', count: 10 },
            // Left edge - tentacles reaching right
            { edge: 'left', count: 8 },
            // Right edge - tentacles reaching left
            { edge: 'right', count: 8 },
        ];

        edges.forEach(({ edge, count }) => {
            for (let i = 0; i < count; i++) {
                this.createEdgeTentacle(edge, i, count);
            }
        });
    }

    createEdgeTentacle(edge, index, total) {
        const tentacle = document.createElement('div');
        tentacle.className = 'edge-tentacle';
        
        // Determine position and angle based on edge
        let x, y, angle, length;
        const spread = 100 / (total + 1);
        const position = spread * (index + 1);
        
        switch (edge) {
            case 'top':
                x = position;
                y = 0;
                angle = 90 + (Math.random() - 0.5) * 40; // Pointing down with variance
                length = 80 + Math.random() * 120;
                break;
            case 'bottom':
                x = position;
                y = 100;
                angle = -90 + (Math.random() - 0.5) * 40; // Pointing up with variance
                length = 60 + Math.random() * 100;
                break;
            case 'left':
                x = 0;
                y = position;
                angle = 0 + (Math.random() - 0.5) * 40; // Pointing right with variance
                length = 60 + Math.random() * 100;
                break;
            case 'right':
                x = 100;
                y = position;
                angle = 180 + (Math.random() - 0.5) * 40; // Pointing left with variance
                length = 60 + Math.random() * 100;
                break;
        }
        
        const size = length * 2;
        tentacle.style.width = `${size}px`;
        tentacle.style.height = `${size}px`;
        tentacle.style.left = `calc(${x}% - ${size/2}px)`;
        tentacle.style.top = `calc(${y}% - ${size/2}px)`;
        
        // Create SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        
        // Generate squiggly path
        const path = this.generateSquigglyPath(size/2, size/2, angle, length);
        const pathLength = 1000;
        
        // Main dark path
        const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mainPath.setAttribute('d', path);
        mainPath.setAttribute('stroke', '#0a0505');
        mainPath.setAttribute('stroke-width', `${10 + Math.random() * 8}`);
        mainPath.setAttribute('fill', 'none');
        mainPath.setAttribute('stroke-linecap', 'round');
        mainPath.style.strokeDasharray = pathLength;
        mainPath.style.strokeDashoffset = pathLength;
        mainPath.style.setProperty('--path-length', pathLength);
        mainPath.style.setProperty('--grow-duration', `${1 + Math.random() * 1.5}s`);
        mainPath.style.animationDelay = `${Math.random() * 0.8}s`;
        mainPath.style.animation = `tentacleGrow var(--grow-duration) ease-out forwards`;
        mainPath.style.filter = 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))';
        
        svg.appendChild(mainPath);
        
        // Add smaller branches
        const branchCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < branchCount; i++) {
            const branchAngle = angle + (Math.random() - 0.5) * 80;
            const branchLength = length * (0.2 + Math.random() * 0.3);
            const startDist = length * (0.3 + Math.random() * 0.4);
            
            const startX = size/2 + Math.cos(angle * Math.PI / 180) * startDist;
            const startY = size/2 + Math.sin(angle * Math.PI / 180) * startDist;
            
            const branchPathD = this.generateSquigglyPath(startX, startY, branchAngle, branchLength);
            
            const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            branch.setAttribute('d', branchPathD);
            branch.setAttribute('stroke', '#0a0505');
            branch.setAttribute('stroke-width', `${4 + Math.random() * 4}`);
            branch.setAttribute('fill', 'none');
            branch.setAttribute('stroke-linecap', 'round');
            branch.style.strokeDasharray = pathLength;
            branch.style.strokeDashoffset = pathLength;
            branch.style.setProperty('--path-length', pathLength);
            branch.style.setProperty('--grow-duration', `${1.5 + Math.random() * 1}s`);
            branch.style.animationDelay = `${0.5 + Math.random() * 0.8}s`;
            branch.style.animation = `tentacleGrow var(--grow-duration) ease-out forwards`;
            
            svg.appendChild(branch);
        }
        
        tentacle.appendChild(svg);
        this.portalContainer.appendChild(tentacle);
    }

    createEmbers() {
        // Continuously create rising embers from the portal
        this.emberInterval = setInterval(() => {
            if (!this.isActive) return;
            
            const ember = document.createElement('div');
            ember.className = 'portal-ember';
            
            // Position near center (portal area)
            ember.style.left = `${45 + Math.random() * 10}%`;
            ember.style.top = `${45 + Math.random() * 10}%`;
            
            // Random properties
            const size = 2 + Math.random() * 4;
            ember.style.width = `${size}px`;
            ember.style.height = `${size}px`;
            ember.style.setProperty('--rise-duration', `${2 + Math.random() * 2}s`);
            ember.style.setProperty('--drift', `${-30 + Math.random() * 60}px`);
            
            this.portalContainer.appendChild(ember);
            this.embers.push(ember);
            
            // Remove ember after animation
            setTimeout(() => {
                if (ember.parentNode) {
                    ember.parentNode.removeChild(ember);
                }
                const index = this.embers.indexOf(ember);
                if (index > -1) {
                    this.embers.splice(index, 1);
                }
            }, 4000);
        }, 150);
    }

    recolorExtrusions(baseColor) {
        document.querySelectorAll('.floating-icon').forEach(icon => {
            const layers = icon.querySelectorAll('.extrusion-layer svg');
            const count = layers.length;
            layers.forEach((svg, i) => {
                const distFromEdge = Math.min(i, count - 1 - i);
                const darkenFactor = 1 - ((1 - distFromEdge / (count / 2)) * 0.35);
                const r = Math.round(baseColor.r * darkenFactor);
                const g = Math.round(baseColor.g * darkenFactor);
                const b = Math.round(baseColor.b * darkenFactor);
                svg.style.color = `rgb(${r}, ${g}, ${b})`;
            });
        });
    }
}

// Initialize Upside Down Mode
document.addEventListener('DOMContentLoaded', () => {
    new UpsideDownMode();
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

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const baseColor = isDark
            ? { r: 185, g: 190, b: 200 }
            : { r: 210, g: 215, b: 220 };

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
