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
        this.init();
    }

    init() {
        const mobileButton = document.getElementById('toggle-navigation-menu');
        const header = document.getElementById('main-header');
        
        if (mobileButton && header) {
            mobileButton.addEventListener('click', () => {
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

        // Close menu when clicking outside (mobile)
        document.addEventListener('click', (e) => {
            if (this.menuOpen && 
                !e.target.closest('#main-header') && 
                header && mobileButton) {
                this.toggleMenu(header, mobileButton);
            }
        });

        // Handle touch events for better mobile interaction
        document.addEventListener('touchstart', (e) => {
            if (this.menuOpen && 
                !e.target.closest('#main-header') && 
                header && mobileButton) {
                this.toggleMenu(header, mobileButton);
            }
        }, { passive: true });

        // Handle escape key to close menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuOpen && header && mobileButton) {
                this.toggleMenu(header, mobileButton);
            }
        });
    }

    toggleMenu(header, button) {
        this.menuOpen = !this.menuOpen;
        
        if (this.menuOpen) {
            header.classList.add('menu-open');
            document.body.classList.add('menu-open');
            // Prevent background scrolling on mobile
            document.body.style.overflow = 'hidden';
        } else {
            header.classList.remove('menu-open');
            document.body.classList.remove('menu-open');
            // Restore background scrolling
            document.body.style.overflow = '';
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

        // Convert unordered lists
        html = html.replace(/^\s*- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

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
        
        // Create floating spores
        this.createSpores();
        
        // Create rising embers
        this.createEmbers();
    }

    deactivate() {
        this.isActive = false;
        document.body.classList.remove('upside-down-mode');
        
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
        // Create tentacles spreading in all directions from center
        const tentacleConfigs = [
            // Top tentacles
            { angle: -90, length: 500, width: 25, x: 50, y: 50, delay: 0 },
            { angle: -70, length: 450, width: 20, x: 55, y: 48, delay: 0.2 },
            { angle: -110, length: 480, width: 22, x: 45, y: 48, delay: 0.1 },
            { angle: -60, length: 400, width: 16, x: 60, y: 50, delay: 0.4 },
            { angle: -120, length: 420, width: 18, x: 40, y: 50, delay: 0.3 },
            { angle: -80, length: 380, width: 14, x: 52, y: 46, delay: 0.5 },
            { angle: -100, length: 390, width: 15, x: 48, y: 46, delay: 0.45 },
            
            // Bottom tentacles
            { angle: 90, length: 480, width: 24, x: 50, y: 55, delay: 0.1 },
            { angle: 70, length: 420, width: 20, x: 55, y: 54, delay: 0.25 },
            { angle: 110, length: 440, width: 21, x: 45, y: 54, delay: 0.15 },
            { angle: 60, length: 380, width: 15, x: 58, y: 52, delay: 0.5 },
            { angle: 120, length: 400, width: 17, x: 42, y: 52, delay: 0.4 },
            
            // Side tentacles (left)
            { angle: 180, length: 450, width: 22, x: 45, y: 50, delay: 0.2 },
            { angle: 160, length: 400, width: 18, x: 44, y: 55, delay: 0.35 },
            { angle: -160, length: 420, width: 19, x: 44, y: 45, delay: 0.3 },
            { angle: 150, length: 350, width: 14, x: 42, y: 58, delay: 0.55 },
            { angle: -150, length: 360, width: 15, x: 42, y: 42, delay: 0.5 },
            
            // Side tentacles (right)
            { angle: 0, length: 460, width: 23, x: 55, y: 50, delay: 0.15 },
            { angle: 20, length: 410, width: 18, x: 56, y: 54, delay: 0.3 },
            { angle: -20, length: 400, width: 17, x: 56, y: 46, delay: 0.35 },
            { angle: 30, length: 340, width: 13, x: 58, y: 56, delay: 0.6 },
            { angle: -30, length: 350, width: 14, x: 58, y: 44, delay: 0.55 },
            
            // Diagonal corner tentacles
            { angle: -45, length: 520, width: 20, x: 58, y: 45, delay: 0.25 },
            { angle: -135, length: 500, width: 19, x: 42, y: 45, delay: 0.3 },
            { angle: 45, length: 490, width: 18, x: 58, y: 55, delay: 0.35 },
            { angle: 135, length: 510, width: 21, x: 42, y: 55, delay: 0.2 },
        ];

        tentacleConfigs.forEach(config => {
            this.createTentacle(config);
        });
    }

    createTentacle(config) {
        const tentacle = document.createElement('div');
        tentacle.className = 'portal-tentacle';
        
        // Position from center of screen
        tentacle.style.left = `${config.x}%`;
        tentacle.style.top = `${config.y}%`;
        tentacle.style.width = `${config.width}px`;
        tentacle.style.height = `${config.length}px`;
        
        // Set CSS custom properties for animation
        tentacle.style.setProperty('--rotation', `${config.angle}deg`);
        tentacle.style.setProperty('--delay', `${config.delay}s`);
        tentacle.style.setProperty('--grow-duration', `${1.5 + Math.random() * 1}s`);
        tentacle.style.setProperty('--wave-duration', `${3 + Math.random() * 2}s`);
        
        // Calculate gradient angle based on tentacle direction
        const gradientAngle = config.angle + 90;
        tentacle.style.setProperty('--tentacle-angle', `${gradientAngle}deg`);
        
        // Set transform origin based on angle
        if (config.angle >= -90 && config.angle <= 90) {
            tentacle.style.setProperty('--origin-x', '50%');
            tentacle.style.setProperty('--origin-y', '0%');
        } else {
            tentacle.style.setProperty('--origin-x', '50%');
            tentacle.style.setProperty('--origin-y', '100%');
        }
        
        // Add organic segments
        const segmentCount = Math.floor(config.length / 40);
        for (let i = 0; i < segmentCount; i++) {
            const segment = document.createElement('div');
            segment.className = 'tentacle-segment';
            segment.style.top = `${(i / segmentCount) * 100}%`;
            segment.style.opacity = 0.3 + Math.random() * 0.3;
            tentacle.appendChild(segment);
        }
        
        // Add small branch tentacles
        const branchCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < branchCount; i++) {
            const branch = document.createElement('div');
            branch.className = 'tentacle-branch';
            branch.style.top = `${20 + i * 25}%`;
            branch.style.left = Math.random() > 0.5 ? '-6px' : `${config.width - 2}px`;
            branch.style.transform = `rotate(${Math.random() > 0.5 ? -30 : 30}deg)`;
            branch.style.animationDelay = `${Math.random() * 2}s`;
            tentacle.appendChild(branch);
        }
        
        this.portalContainer.appendChild(tentacle);
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
}

// Initialize Upside Down Mode
document.addEventListener('DOMContentLoaded', () => {
    new UpsideDownMode();
});
