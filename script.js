/**
 * PUJA — EFFECTIVELY INFINITE PROFILE UNIVERSE
 * Production-grade Virtualized Engine with BigInt Support & DOM Recycling.
 */

(function () {
    'use strict';

    // --- CONFIGURATION & CONSTANTS ---
    const CARD_HEIGHT_ESTIMATE = 420; // Estimated height in px per profile card including gaps
    const BUFFER_COUNT = 6;           // Number of extra cards rendered above and below viewport
    const MIN_RENDERED_CARDS = 12;    // Minimum DOM cards to keep active

    // --- STATE MANAGEMENT ---
    let currentLogicalIndex = 1n;     // Starting profile index (BigInt safe)
    let totalVirtualHeight = 1000000000000n; // Logical scroll height space
    let isScrolling = false;
    let scrollRafId = null;

    // Viewport & DOM element references
    const viewport = document.getElementById('viewport');
    const cardsContainer = document.getElementById('cards-container');
    const spacerTop = document.getElementById('spacer-top');
    const spacerBottom = document.getElementById('spacer-bottom');
    const currentProfileDisplay = document.getElementById('current-profile-display');

    // Modals
    const jumpModal = document.getElementById('jump-modal');
    const infoModal = document.getElementById('info-modal');
    const jumpBtn = document.getElementById('jump-btn');
    const infoBtn = document.getElementById('info-btn');
    const jumpClose = document.getElementById('modal-close');
    const jumpCancel = document.getElementById('jump-cancel');
    const jumpSubmit = document.getElementById('jump-submit');
    const jumpInput = document.getElementById('jump-input');
    const infoClose = document.getElementById('info-close');
    const infoDismiss = document.getElementById('info-dismiss');

    // DOM Card Pool (Bounded recycling array)
    let activeCardElements = [];
    let maxPoolSize = 16;

    // --- DETERMINISTIC HASHING & SEED GENERATION ---
    /**
     * Generates a deterministic hash integer from a BigInt ID and a salt string.
     */
    function hashId(idBigInt, salt) {
        let str = idBigInt.toString() + salt;
        let hash = 2166136261n;
        for (let i = 0; i < str.length; i++) {
            hash ^= BigInt(str.charCodeAt(i));
            hash = (hash * 16777619n) & 0xFFFFFFFFFFFFFFFFn;
        }
        return Number(hash % 1000000000n);
    }

    class SeedRandom {
        constructor(seedNum) {
            this.seed = seedNum;
        }
        next() {
            this.seed = (this.seed * 9301n + 49297n) % 233280n;
            return Number(this.seed) / 233280.0;
        }
        range(min, max) {
            return min + Math.floor(this.next() * (max - min + 1));
        }
        pick(arr) {
            return arr[Math.floor(this.next() * arr.length)];
        }
    }

    // --- DICTIONARIES FOR DETERMINISTIC PROFILE SYNTHESIS ---
    const FIRST_NAMES = ['Aria', 'Kian', 'Zara', 'Orion', 'Elena', 'Tariq', 'Maya', 'Leif', 'Soren', 'Nyla', 'Cassian', 'Mira', 'Zephyr', 'Freya', 'Dante', 'Ayla', 'Idris', 'Luna', 'Cyrus', 'Isla'];
    const LAST_NAMES = ['Vance', 'Sterling', 'Al-Fassi', 'Novak', 'Sinclair', 'Moreau', ' Thorne', 'Dubois', 'Kovacs', 'Vogel', 'Takahashi', 'Mercer', 'Astor', 'Reyes', 'Orlov', 'Strand'];
    const PROFESSIONS = ['Architect', 'Curator', 'Quantum Researcher', 'Design Director', 'Cartographer', 'Astrophysicist', 'Typographer', 'Philosophy Fellow', 'Cinematographer', 'Spatial Designer', 'Botanicalist', 'Audio Engineer'];
    const CITIES = ['Vienna', 'Kyoto', 'Reykjavik', 'Zurich', 'Florence', 'Stockholm', 'Edinburgh', 'Singapore', 'Geneva', 'Montreal', 'Oto', 'Lisbon'];
    const BIO_TEMPLATES = [
        " Exploring the intersection of classical aesthetics and modern systems.",
        " Dedicated to minimal architecture and digital craftsmanship.",
        " Seeking silence in a noisy digital cosmos. Avid reader and collector of rare prints.",
        " Building timeless tools and studying generative topologies.",
        " Capturing transient light and permanent structures across continents.",
        " Researching decentralized networks and classical philosophy."
    ];

    /**
     * Generates a complete deterministic profile object from any BigInt profile ID.
     */
    function generateProfile(idBigInt) {
        const seedValue = BigInt(hashId(idBigInt, "PujaUniverseSeed"));
        const rng = new SeedRandom(seedValue);

        const firstName = rng.pick(FIRST_NAMES);
        const lastName = rng.pick(LAST_NAMES);
        const fullName = `${firstName} ${lastName}`;
        const username = `@${firstName.toLowerCase()}_${lastName.toLowerCase()}${rng.range(10, 99)}`;
        const age = rng.range(21, 54);
        const location = rng.pick(CITIES);
        const profession = rng.pick(PROFESSIONS);
        const bio = rng.pick(BIO_TEMPLATES);

        const followers = rng.range(1200, 98500);
        const following = rng.range(180, 2400);
        const posts = rng.range(45, 1250);

        const isVerified = rng.next() > 0.65;
        const isOnline = rng.next() > 0.3;

        // Deterministic Avatar SVG generation
        const bgColors = ['#1e222d', '#25201c', '#192523', '#281c25', '#1c2228'];
        const avatarBg = rng.pick(bgColors);
        const initials = `${firstName[0]}${lastName[0]}`;
        const avatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="${encodeURIComponent(avatarBg)}"/><text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" fill="%23d4af37" font-family="Cinzel, serif" font-size="52" font-weight="600">${initials}</text></svg>`;

        return {
            id: idBigInt,
            formattedId: formatBigInt(idBigInt),
            fullName,
            username,
            age,
            location,
            profession,
            bio,
            followers: formatNumber(followers),
            following: formatNumber(following),
            posts: formatNumber(posts),
            isVerified,
            isOnline,
            avatarSvg
        };
    }

    function formatBigInt(n) {
        return n.toLocaleString('en-US');
    }

    function formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }

    // --- DOM POOL CREATION & RECYCLING ---
    function createCardElement() {
        const card = document.createElement('article');
        card.className = 'profile-card';
        card.innerHTML = `
            <div class="card-top">
                <div class="avatar-wrapper">
                    <img class="avatar" src="" alt="Avatar" loading="lazy">
                    <div class="status-indicator"></div>
                </div>
                <div class="card-meta-badge"></div>
            </div>
            <div class="profile-info">
                <div class="name-row">
                    <h2 class="profile-name"></h2>
                    <span class="verified-badge" title="Verified Profile">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                    </span>
                </div>
                <div class="profile-handle"></div>
                <p class="profile-bio"></p>
            </div>
            <div class="profile-details-grid">
                <div class="detail-item location-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span></span>
                </div>
                <div class="detail-item profession-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    <span></span>
                </div>
            </div>
            <div class="profile-stats">
                <div class="stat-box">
                    <div class="stat-value followers-val"></div>
                    <div class="stat-label">Followers</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value following-val"></div>
                    <div class="stat-label">Following</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value posts-val"></div>
                    <div class="stat-label">Posts</div>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary connect-btn">Connect</button>
                <button class="btn btn-secondary inspect-btn">Profile</button>
            </div>
        `;
        return card;
    }

    function initCardPool() {
        cardsContainer.innerHTML = '';
        activeCardElements = [];
        for (let i = 0; i < maxPoolSize; i++) {
            const cardEl = createCardElement();
            cardsContainer.appendChild(cardEl);
            activeCardElements.push(cardEl);
        }
    }

    function updateCardContent(cardEl, profile) {
        cardEl.dataset.profileId = profile.id.toString();
        cardEl.querySelector('.avatar').src = profile.avatarSvg;
        cardEl.querySelector('.card-meta-badge').textContent = `#${profile.formattedId}`;
        cardEl.querySelector('.profile-name').textContent = profile.fullName;
        cardEl.querySelector('.profile-handle').textContent = `${profile.username} • ${profile.age} yrs`;
        cardEl.querySelector('.profile-bio').textContent = profile.bio;
        cardEl.querySelector('.location-item span').textContent = profile.location;
        cardEl.querySelector('.profession-item span').textContent = profile.profession;
        cardEl.querySelector('.followers-val').textContent = profile.followers;
        cardEl.querySelector('.following-val').textContent = profile.following;
        cardEl.querySelector('.posts-val').textContent = profile.posts;

        const verifiedBadge = cardEl.querySelector('.verified-badge');
        verifiedBadge.style.display = profile.isVerified ? 'inline-flex' : 'none';

        const statusIndicator = cardEl.querySelector('.status-indicator');
        if (profile.isOnline) {
            statusIndicator.classList.remove('offline');
        } else {
            statusIndicator.classList.add('offline');
        }
    }

    // --- VIRTUALIZATION & SCROLL ENGINE ---
    function renderVirtualWindow() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const viewportHeight = window.innerHeight;

        // Calculate index offset based on scroll position
        let estimatedIndexOffset = BigInt(Math.floor(scrollTop / CARD_HEIGHT_ESTIMATE));
        let startIndex = currentLogicalIndex + estimatedIndexOffset - BigInt(BUFFER_COUNT);
        
        if (startIndex < 1n) {
            startIndex = 1n;
        }

        const renderedCount = activeCardElements.length;
        const topSpacerHeight = Number(startIndex - 1n) * CARD_HEIGHT_ESTIMATE;
        const remainingSpacerHeight = Math.max(0, Number(totalVirtualHeight - startIndex - BigInt(renderedCount)) * CARD_HEIGHT_ESTIMATE);

        spacerTop.style.height = `${topSpacerHeight}px`;
        spacerBottom.style.height = `${remainingSpacerHeight}px`;

        // Render profiles into recycled DOM cards
        for (let i = 0; i < renderedCount; i++) {
            const profileId = startIndex + BigInt(i);
            if (profileId > totalVirtualHeight) break;
            const profile = generateProfile(profileId);
            updateCardContent(activeCardElements[i], profile);
        }

        // Update Header Badge with approximate centered profile
        const centerIndex = startIndex + BigInt(Math.floor(renderedCount / 2));
        currentProfileDisplay.textContent = `#${formatBigInt(centerIndex)}`;
    }

    function handleScroll() {
        if (!isScrolling) {
            isScrolling = true;
            scrollRafId = requestAnimationFrame(() => {
                renderVirtualWindow();
                isScrolling = false;
            });
        }
    }

    // --- JUMP TO PROFILE NAVIGATION ---
    function jumpToProfile(targetBigInt) {
        if (targetBigInt < 1n) targetBigInt = 1n;
        currentLogicalIndex = targetBigInt > BigInt(BUFFER_COUNT) ? targetBigInt - BigInt(BUFFER_COUNT) : 1n;

        // Calculate physical scroll position
        const targetScrollY = Number(targetBigInt - 1n) * CARD_HEIGHT_ESTIMATE;
        window.scrollTo({
            top: targetScrollY,
            behavior: 'smooth'
        });

        setTimeout(renderVirtualWindow, 100);
    }

    // --- EVENT LISTENERS & MODAL INTERACTION ---
    function setupEventListeners() {
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', () => {
            renderVirtualWindow();
        }, { passive: true });

        // Jump Modal triggers
        jumpBtn.addEventListener('click', () => {
            jumpModal.classList.add('active');
            jumpInput.value = '';
            jumpInput.focus();
        });

        const closeModal = () => jumpModal.classList.remove('active');
        jumpClose.addEventListener('click', closeModal);
        jumpCancel.addEventListener('click', closeModal);
        jumpModal.addEventListener('click', (e) => {
            if (e.target === jumpModal) closeModal();
        });

        jumpSubmit.addEventListener('click', () => {
            const val = jumpInput.value.trim().replace(/,/g, '');
            if (val) {
                try {
                    const bigIntVal = BigInt(val);
                    jumpToProfile(bigIntVal);
                    closeModal();
                } catch (err) {
                    alert('Please enter a valid integer profile index.');
                }
            }
        });

        jumpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                jumpSubmit.click();
            }
        });

        // Info Modal triggers
        infoBtn.addEventListener('click', () => infoModal.classList.add('active'));
        const closeInfo = () => infoModal.classList.remove('active');
        infoClose.addEventListener('click', closeInfo);
        infoDismiss.addEventListener('click', closeInfo);
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) closeInfo();
        });

        // Card button event delegation
        cardsContainer.addEventListener('click', (e) => {
            const connectBtn = e.target.closest('.connect-btn');
            const inspectBtn = e.target.closest('.inspect-btn');
            const card = e.target.closest('.profile-card');

            if (!card) return;
            const profileId = card.dataset.profileId;

            if (connectBtn) {
                const originalText = connectBtn.textContent;
                connectBtn.textContent = 'Connected ✓';
                connectBtn.style.background = '#10b981';
                connectBtn.style.color = '#fff';
                setTimeout(() => {
                    connectBtn.textContent = originalText;
                    connectBtn.style.background = '';
                    connectBtn.style.color = '';
                }, 2000);
            } else if (inspectBtn || e.target.closest('.avatar-wrapper') || e.target.closest('.profile-name')) {
                jumpToProfile(BigInt(profileId));
            }
        });
    }

    // --- INITIALIZATION ---
    function init() {
        initCardPool();
        renderVirtualWindow();
        setupEventListeners();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
