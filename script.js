/**
 * PUJA — INFINITE PROFILE GENERATOR
 * Core Client-Side Virtualized Architecture with BigInt & DOM Recycling
 */

(function () {
    'use strict';

    // --- Configuration & Constants ---
    const CONFIG = {
        cardHeight: 560,          // Approximate card height including gap
        bufferCount: 5,           // Overscan buffer cards above and below viewport
        maxCacheSize: 150,        // LRU Cache maximum size for profile data
        recenteringThreshold: 1000000n // Recenter physical offset when logical index exceeds this range
    };

    // --- Deterministic Seeded Generator Helpers (PCG / Murmur-like hash) ---
    function hashBigIntToNumber(n) {
        let x = n ^ (n >> 30n);
        x = x * 0xbf58476d1ce4e5b9n;
        x = x ^ (x >> 27n);
        x = x * 0x94d049bb133111ebn;
        x = x ^ (x >> 31n);
        return Number(x & 0x7fffffffffffffffn);
    }

    class DeterministicRNG {
        constructor(seedBigInt) {
            this.state = hashBigIntToNumber(seedBigInt);
            if (this.state === 0) this.state = 1337;
        }
        nextFloat() {
            this.state = (this.state * 1664525 + 1013904223) >>> 0;
            return this.state / 4294967296;
        }
        nextInt(min, max) {
            return Math.floor(this.nextFloat() * (max - min + 1)) + min;
        }
        pick(array) {
            return array[this.nextInt(0, array.length - 1)];
        }
    }

    // --- Data Dictionaries for Deterministic Generation ---
    const PROFESSIONS = [
        "Digital Architect", "UI/UX Artisan", "Creative Technologist", "Full-Stack Scholar",
        "Systems Analyst", "Neural Network Researcher", "Quantum Enthusiast", "Visual Designer",
        "Open Source Advocate", "Data Sculptor", "Minimalist Coder", "Cyberneticist",
        "Autonomous Creator", "Algorithm Poet", "Interface Engineer", "Cloud Infrastructure Lead"
    ];

    const LOCATIONS = [
        "Kyoto, Japan", "Reykjavik, Iceland", "Zurich, Switzerland", "Stockholm, Sweden",
        "Wellington, New Zealand", "Singapore, SG", "Helsinki, Finland", "Oslo, Norway",
        "Copenhagen, Denmark", "Vienna, Austria", "Montreal, Canada", "Berlin, Germany",
        "Amsterdam, Netherlands", "Edinburgh, Scotland", "San Francisco, USA", "Dublin, Ireland"
    ];

    const INTEREST_POOL = [
        "TypeScript", "Rust", "Architecture", "Design Systems", "Generative Art", "Cybernetics",
        "Astrophysics", "Minimalism", "Typography", "Audio Synthesis", "Machine Learning", "Linux",
        "Photography", "Philosophy", "Cryptography", "Distributed Systems", "UI Animation", "Open Source"
    ];

    const BIO_TEMPLATES = [
        "Exploring the intersection of elegant code and minimalist design principles.",
        "Building resilient digital systems and high-performance interfaces.",
        "Passionate about clean architecture, open source, and generative aesthetics.",
        "Crafting seamless user experiences with modern web standards.",
        "Dedicated to simplicity, efficiency, and timeless digital craftsmanship.",
        "Investigating complex distributed systems and autonomous agent workflows.",
        "Balancing rigorous engineering with refined visual expression."
    ];

    // --- Avatar SVG Generator ---
    function generateAvatarSVG(seedNum, name) {
        const rng = new DeterministicRNG(seedNum);
        const hue = rng.nextInt(0, 360);
        const sat = rng.nextInt(40, 70);
        const lit = rng.nextInt(20, 35);
        
        const color1 = `hsl(${hue}, ${sat}%, ${lit}%)`;
        const color2 = `hsl(${(hue + 60) % 360}, ${sat}%, ${lit - 10}%)`;
        const goldAccent = '#D4AF37';

        const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2);

        return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${color1}"/>
                    <stop offset="100%" stop-color="${color2}"/>
                </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="60" fill="url(%23g)"/>
            <circle cx="60" cy="60" r="56" fill="none" stroke="${goldAccent}" stroke-width="1.5" stroke-opacity="0.6"/>
            <text x="60" y="65" font-family="-apple-system, sans-serif" font-size="36" font-weight="700" fill="%23F5F5F5" text-anchor="middle" dominant-baseline="middle">${initials}</text>
        </svg>`;
    }

    // --- Profile Data Generator ---
    function generateProfileData(profileId) {
        const rng = new DeterministicRNG(profileId);
        const name = `Puja ${profileId.toString()}`;
        const handle = `@puja${profileId.toString().toLowerCase()}`;
        
        const profession = rng.pick(PROFESSIONS);
        const location = rng.pick(LOCATIONS);
        const bio = rng.pick(BIO_TEMPLATES);

        // Pick 3 unique interests
        const shuffledInterests = [...INTEREST_POOL].sort(() => rng.nextFloat() - 0.5);
        const interests = shuffledInterests.slice(0, 3);

        // Statistics
        const followersNum = rng.nextInt(120, 98900);
        const followingNum = rng.nextInt(40, 2400);
        const postsNum = rng.nextInt(12, 1450);

        function formatCount(num) {
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        }

        return {
            id: profileId,
            name,
            handle,
            avatar: generateAvatarSVG(profileId, name),
            profession,
            location,
            bio,
            interests,
            followers: formatCount(followersNum),
            following: formatCount(followingNum),
            posts: formatCount(postsNum)
        };
    }

    // --- LRU Cache ---
    class ProfileCache {
        constructor(maxSize) {
            this.maxSize = maxSize;
            this.cache = new Map();
        }
        get(id) {
            const key = id.toString();
            if (!this.cache.has(key)) return null;
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value); // Refresh position
            return value;
        }
        set(id, value) {
            const key = id.toString();
            if (this.cache.has(key)) {
                this.cache.delete(key);
            } else if (this.cache.size >= this.maxSize) {
                const oldestKey = this.cache.keys().next().value;
                this.cache.delete(oldestKey);
            }
            this.cache.set(key, value);
        }
        size() {
            return this.cache.size;
        }
    }

    // --- Application State ---
    const profileCache = new ProfileCache(CONFIG.maxCacheSize);

    let state = {
        currentLogicalIndex: 1n,
        physicalScrollTop: 0,
        viewportHeight: window.innerHeight,
        isDevMode: false,
        isRestoringUrl: true
    };

    // --- DOM Elements ---
    const viewportContainer = document.getElementById('viewport-container');
    const virtualSpacer = document.getElementById('virtual-spacer');
    const profileStream = document.getElementById('profile-stream');
    const currentPujaIndicator = document.getElementById('current-puja-number');
    const jumpInput = document.getElementById('jump-input');
    const jumpBtn = document.getElementById('jump-btn');
    const devToggleBtn = document.getElementById('dev-toggle-btn');
    const perfMonitor = document.getElementById('perf-monitor');
    const toast = document.getElementById('toast');

    // Perf metrics elements
    const perfDomCount = document.getElementById('perf-dom-count');
    const perfLogical = document.getElementById('perf-logical');
    const perfScroll = document.getElementById('perf-scroll');
    const perfCache = document.getElementById('perf-cache');

    // --- Card Pool for DOM Recycling ---
    const physicalCards = [];
    let physicalCardCount = 12; // Initial physical cards pool

    function initPhysicalPool() {
        profileStream.innerHTML = '';
        physicalCards.length = 0;

        // Calculate dynamic pool size based on viewport height
        const calculatedCount = Math.ceil(window.innerHeight / CONFIG.cardHeight) + (CONFIG.bufferCount * 2);
        physicalCardCount = Math.max(10, calculatedCount);

        for (let i = 0; i < physicalCardCount; i++) {
            const cardEl = document.createElement('article');
            cardEl.className = 'profile-card';
            cardEl.innerHTML = `
                <div class="card-avatar-wrapper">
                    <img class="card-avatar" src="" alt="Avatar" loading="lazy">
                </div>
                <div class="card-identity">
                    <h2 class="card-name"></h2>
                    <span class="card-handle"></span>
                </div>
                <p class="card-bio"></p>
                <div class="card-meta">
                    <span class="card-location"></span>
                    <span class="separator">·</span>
                    <span class="card-profession"></span>
                </div>
                <div class="card-interests"></div>
                <div class="card-stats">
                    <div class="stat-item">
                        <span class="stat-value stat-followers"></span>
                        <span class="stat-label">Followers</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value stat-following"></span>
                        <span class="stat-label">Following</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value stat-posts"></span>
                        <span class="stat-label">Posts</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary action-view" type="button">View Profile</button>
                    <button class="btn action-share" type="button">Share</button>
                </div>
            `;

            // Attach event listeners for card actions
            const viewBtn = cardEl.querySelector('.action-view');
            const shareBtn = cardEl.querySelector('.action-share');

            viewBtn.addEventListener('click', () => {
                const profileId = cardEl._profileId;
                if (profileId) showToast(`Loaded ${profileId === 1n ? 'Puja 1' : 'Puja ' + profileId.toString()}`);
            });

            shareBtn.addEventListener('click', () => {
                const profileId = cardEl._profileId;
                if (profileId) {
                    const url = `${window.location.origin}${window.location.pathname}?puja=${profileId.toString()}`;
                    navigator.clipboard.writeText(url).then(() => {
                        showToast(`Copied share link for Puja ${profileId.toString()}`);
                    }).catch(() => {
                        showToast(`Puja ${profileId.toString()} link ready`);
                    });
                }
            });

            profileStream.appendChild(cardEl);
            physicalCards.push({
                element: cardEl,
                currentProfileId: null,
                token: 0
            });
        }
    }

    // --- Virtualization Engine ---
    function updateVirtualWindow() {
        const scrollTop = viewportContainer.scrollTop;
        state.physicalScrollTop = scrollTop;

        // Estimate total virtual height (bounded representation)
        const totalVirtualHeight = 1000000000000000n; // 1 Quadrillion virtual scroll space
        // To prevent CSS layout limitations with extremely huge numbers, we map scroll ratio
        // But for pure virtualization, we track logical index offset.
        
        // Calculate starting logical index based on scrollTop
        let cardIndexOffset = Math.floor(scrollTop / CONFIG.cardHeight) - CONFIG.bufferCount;
        if (cardIndexOffset < 0) cardIndexOffset = 0;

        const baseLogical = state.currentLogicalIndex >= BigInt(cardIndexOffset) 
            ? state.currentLogicalIndex - BigInt(Math.max(0, cardIndexOffset)) 
            : state.currentLogicalIndex + BigInt(cardIndexOffset);

        // Render physical cards
        const streamOffsetY = cardIndexOffset * CONFIG.cardHeight;
        profileStream.style.transform = `translateY(${streamOffsetY}px)`;

        // Total virtual spacer height
        virtualSpacer.style.height = '10000000px';

        let middleCardId = state.currentLogicalIndex;
        let minDistanceToCenter = Infinity;

        for (let i = 0; i < physicalCards.length; i++) {
            const cardObj = physicalCards[i];
            const logicalId = BigInt(cardIndexOffset + i) + 1n;
            
            if (logicalId < 1n) {
                cardObj.element.style.visibility = 'hidden';
                continue;
            } else {
                cardObj.element.style.visibility = 'visible';
            }

            // Determine if content update is needed
            if (cardObj.currentProfileId !== logicalId) {
                cardObj.currentProfileId = logicalId;
                cardObj.token++;
                const token = cardObj.token;

                // Fetch or generate profile data
                let profile = profileCache.get(logicalId);
                if (!profile) {
                    profile = generateProfileData(logicalId);
                    profileCache.set(logicalId, profile);
                }

                // Apply data safely
                if (cardObj.token === token) {
                    renderCardData(cardObj.element, profile);
                }
            }

            // Track current prominent profile in viewport center
            const cardTop = (cardIndexOffset + i) * CONFIG.cardHeight;
            const distance = Math.abs(cardTop - scrollTop - (window.innerHeight / 2));
            if (distance < minDistanceToCenter) {
                minDistanceToCenter = distance;
                middleCardId = logicalId;
            }
        }

        if (state.currentLogicalIndex !== middleCardId) {
            state.currentLogicalIndex = middleCardId;
            currentPujaIndicator.textContent = `Puja ${middleCardId.toString()}`;
            updateUrlParamSilently(middleCardId);
        }

        updatePerfMonitor();
    }

    function renderCardData(cardEl, profile) {
        cardEl._profileId = profile.id;
        cardEl.querySelector('.card-avatar').src = profile.avatar;
        cardEl.querySelector('.card-name').textContent = profile.name;
        cardEl.querySelector('.card-handle').textContent = profile.handle;
        cardEl.querySelector('.card-bio').textContent = profile.bio;
        cardEl.querySelector('.card-location').textContent = profile.location;
        cardEl.querySelector('.card-profession').textContent = profile.profession;
        
        const interestsContainer = cardEl.querySelector('.card-interests');
        interestsContainer.innerHTML = profile.interests
            .map(interest => `<span class="interest-tag">${interest}</span>`)
            .join('');

        cardEl.querySelector('.stat-followers').textContent = profile.followers;
        cardEl.querySelector('.stat-following').textContent = profile.following;
        cardEl.querySelector('.stat-posts').textContent = profile.posts;
    }

    // --- Scroll & Jump Management ---
    let scrollScheduled = false;
    function handleScroll() {
        if (!scrollScheduled) {
            scrollScheduled = true;
            requestAnimationFrame(() => {
                scrollScheduled = false;
                updateVirtualWindow();
            });
        }
    }

    function jumpToProfile(bigIntId) {
        if (bigIntId < 1n) bigIntId = 1n;
        state.currentLogicalIndex = bigIntId;
        
        // Calculate target scroll position
        const targetOffset = Number(bigIntId - 1n) * CONFIG.cardHeight;
        viewportContainer.scrollTop = Math.max(0, targetOffset - 100);
        
        updateVirtualWindow();
        showToast(`Jumped to Puja ${bigIntId.toString()}`);
    }

    function updateUrlParamSilently(bigIntId) {
        if (state.isRestoringUrl) return;
        const newUrl = `${window.location.pathname}?puja=${bigIntId.toString()}`;
        window.history.replaceState({ puja: bigIntId.toString() }, '', newUrl);
    }

    // --- Toast Notification ---
    let toastTimeout = null;
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 200);
        }, 2500);
    }

    // --- Performance Monitor ---
    function updatePerfMonitor() {
        if (!state.isDevMode) return;
        perfDomCount.textContent = physicalCards.length;
        perfLogical.textContent = state.currentLogicalIndex.toString();
        perfScroll.textContent = Math.round(state.physicalScrollTop);
        perfCache.textContent = `${profileCache.size()} / ${CONFIG.maxCacheSize}`;
    }

    // --- Input Validation & Parsing ---
    function parseBigIntInput(inputStr) {
        const cleaned = inputStr.trim().replace(/[,_]/g, '');
        if (!/^\d+$/.test(cleaned)) return null;
        try {
            return BigInt(cleaned);
        } catch {
            return null;
        }
    }

    // --- Event Listeners Setup ---
    function initEventListeners() {
        viewportContainer.addEventListener('scroll', handleScroll, { passive: true });

        jumpBtn.addEventListener('click', () => {
            const parsed = parseBigIntInput(jumpInput.value);
            if (parsed !== null && parsed > 0n) {
                jumpToProfile(parsed);
                jumpInput.value = '';
            } else {
                showToast('Please enter a valid positive profile number.');
            }
        });

        jumpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                jumpBtn.click();
            }
        });

        devToggleBtn.addEventListener('click', () => {
            state.isDevMode = !state.isDevMode;
            perfMonitor.classList.toggle('hidden', !state.isDevMode);
            devToggleBtn.style.color = state.isDevMode ? 'var(--gold)' : 'var(--muted-text)';
            updatePerfMonitor();
        });

        // Window resize handling with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                initPhysicalPool();
                updateVirtualWindow();
            }, 150);
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                jumpInput.focus();
                jumpInput.select();
            } else if (e.key === 'Home') {
                e.preventDefault();
                jumpToProfile(1n);
            } else if (e.key === 'PageDown') {
                e.preventDefault();
                viewportContainer.scrollTop += window.innerHeight * 0.8;
            } else if (e.key === 'PageUp') {
                e.preventDefault();
                viewportContainer.scrollTop -= window.innerHeight * 0.8;
            }
        });

        // Page Visibility pause handling
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Pause background calculations if any
            }
        });
    }

    // --- Initialization ---
    function init() {
        // Parse URL query parameter on startup (?puja=...)
        const urlParams = new URLSearchParams(window.location.search);
        const pujaParam = urlParams.get('puja');
        
        let initialId = 1n;
        if (pujaParam) {
            const parsed = parseBigIntInput(pujaParam);
            if (parsed !== null && parsed > 0n) {
                initialId = parsed;
            }
        }

        state.currentLogicalIndex = initialId;
        initPhysicalPool();

        // Position initial scroll offset
        if (initialId > 1n) {
            const targetOffset = Number(initialId - 1n) * CONFIG.cardHeight;
            viewportContainer.scrollTop = Math.max(0, targetOffset - 100);
        }

        updateVirtualWindow();
        initEventListeners();

        // Release URL restoration flag
        setTimeout(() => {
            state.isRestoringUrl = false;
        }, 100);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
