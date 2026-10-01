/**
 * PUJA — INFINITE PROFILE GENERATOR ENGINE
 * Fully virtualized, BigInt-safe, deterministic generator with DOM recycling.
 */

(function () {
    // --- CONFIGURATION ---
    const CARD_HEIGHT_ESTIMATE = 280; // Estimated card height in pixels including margins
    const BUFFER_COUNT = 5;          // Extra cards rendered above/below viewport
    const TOTAL_LOGICAL_PROFILES = 9007199254740992n + 9007199254740992n; // Effectively endless scale placeholder, scaled cleanly past safe int max

    // State Variables
    let currentTopIndex = 1n; // 1-indexed BigInt sequence starting at Puja 1
    let containerHeight = 0;
    let viewportHeight = 0;
    let visibleCardCount = 6;
    let lastScrollTop = 0;
    let isRecalibrating = false;

    // DOM Elements
    const viewport = document.getElementById('viewport');
    const virtualSpacer = document.getElementById('virtual-spacer');
    const cardContainer = document.getElementById('card-container');
    const currentBadge = document.getElementById('current-badge');
    const jumpBtn = document.getElementById('jump-btn');
    const jumpModal = document.getElementById('jump-modal');
    const jumpInput = document.getElementById('jump-input');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    // --- DETERMINISTIC SEED & PROFILE GENERATOR ---
    // Uses safe string hashing of BigInt index to produce identical unique properties every single time.
    function generateProfileData(n) {
        // String representation for seed logic
        const strN = n.toString();
        
        // Simple deterministic pseudo-random hash generator based on string char codes
        let hash = 0;
        for (let i = 0; i < strN.length; i++) {
            hash = (hash << 5) - hash + strN.charCodeAt(i);
            hash |= 0; // Convert to 32bit int
        }
        const absHash = Math.abs(hash);

        // Arrays of attributes for deterministic selection
        const professions = [
            "Architect of Virtual Realms", "Quantum Ledger Analyst", "Aesthetic Curator", 
            "Autonomous Systems Lead", "Neo-Classicist Designer", "Senior Cyberneticist",
            "Computational Synthesist", "Principal Metaphysicist", "Artifact Archivist", "Lead Cartographer"
        ];
        const locations = [
            "Neo-Kyoto, Sector 7", "Geneva Protocol Zone", "Reykjavik Nodes", 
            "Vienna Spire", "Zurich Core", "Singapore Marina Matrix", "Berlin Sub-Level 4", "Kyoto Grid"
        ];
        const bios = [
            "Exploring the boundaries of deterministic data arrays and structural aesthetic balance.",
            "Living between logical sequences and continuous digital transformations.",
            "Designing timeless systems designed for eternal execution cycles.",
            "Quietly maintaining infrastructure nodes across distributed ledger topologies.",
            "An archivist of infinite states, turning math into pure digital substance.",
            "Committed to clean architecture, zero-loss precision, and architectural minimalism."
        ];
        const interestPool = [
            ["BigInt Optimization", "Topology", "Matte UI"],
            ["Zero-Loss Arrays", "Cybernetics", "Minimalism"],
            ["Virtualization", "Data Structures", "Monochrome"],
            ["Deterministic Seeds", "Logic", "Graphite"],
            ["Memory Bounds", "Symmetry", "Gold Standards"]
        ];

        const profession = professions[absHash % professions.length];
        const location = locations[(absHash >> 3) % locations.length];
        const bio = bios[(absHash >> 7) % bios.length];
        const interests = interestPool[(absHash >> 11) % interestPool.length];
        
        // Deterministic metrics
        const followers = ((absHash % 98200) + 120).toLocaleString();
        const following = ((absHash % 1400) + 42).toLocaleString();
        const posts = ((absHash % 4900) + 12).toLocaleString();

        // Procedural SVG Avatar generation based on seed hash
        const colorPalette = ['#d4af37', '#e6c555', '#c59b27', '#f3d97b', '#b3902f'];
        const c1 = colorPalette[absHash % colorPalette.length];
        const c2 = colorPalette[(absHash >> 2) % colorPalette.length];
        const shapeType = absHash % 3;
        
        let svgInner = '';
        if (shapeType === 0) {
            svgInner = `<circle cx="32" cy="32" r="20" fill="none" stroke="${c1}" stroke-width="3"/><circle cx="32" cy="32" r="8" fill="${c2}"/>`;
        } else if (shapeType === 1) {
            svgInner = `<rect x="16" y="16" width="32" height="32" rx="4" fill="none" stroke="${c1}" stroke-width="3"/><circle cx="32" cy="32" r="6" fill="${c2}"/>`;
        } else {
            svgInner = `<polygon points="32,12 50,50 14,50" fill="none" stroke="${c1}" stroke-width="3"/><circle cx="32" cy="36" r="5" fill="${c2}"/>`;
        }

        const avatarSvg = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="#121212"/>${svgInner}</svg>`;

        return {
            name: `Puja ${strN}`,
            handle: `@Puja${strN}`,
            profession,
            location,
            bio,
            interests,
            stats: { followers, following, posts },
            avatarSvg
        };
    }

    // --- DOM RECYCLING POOL ARCHITECTURE ---
    const cardPool = [];

    function getOrCreateCardElement() {
        if (cardPool.length > 0) {
            return cardPool.pop();
        }
        // Create card structure once
        const card = document.createElement('article');
        card.className = 'profile-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="avatar-wrapper"></div>
                <div class="profile-meta">
                    <div class="profile-name-row">
                        <h2 class="profile-title"></h2>
                        <span class="profile-handle"></span>
                    </div>
                    <p class="profile-profession"></p>
                    <div class="profile-location">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span class="location-text"></span>
                    </div>
                </div>
            </div>
            <p class="profile-bio"></p>
            <div class="tags-container"></div>
            <div class="card-stats">
                <div class="stat-item">
                    <div class="stat-value followers-val">0</div>
                    <div class="stat-label">Followers</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value following-val">0</div>
                    <div class="stat-label">Following</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value posts-val">0</div>
                    <div class="stat-label">Posts</div>
                </div>
            </div>
            <div class="card-actions">
                <button class="view-profile-btn">View Profile &rarr;</button>
            </div>
        `;
        return card;
    }

    function recycleCardElement(card) {
        if (card && card.parentNode) {
            card.parentNode.removeChild(card);
            cardPool.push(card);
        }
    }

    // --- VIRTUALIZATION ENGINE ---
    function updateVirtualDimensions() {
        viewportHeight = viewport.clientHeight;
        // Calculate how many cards comfortably fit in viewport plus buffer
        visibleCardCount = Math.ceil(viewportHeight / CARD_HEIGHT_ESTIMATE) + (BUFFER_COUNT * 2);
        
        // Set an arbitrary large physical height on the spacer to allow comfortable scroll bars 
        // without approaching browser layout caps or allocating memory.
        containerHeight = 1000000; // 1 million pixels of smooth scroll track
        virtualSpacer.style.height = `${containerHeight}px`;
    }

    function renderVirtualWindow() {
        if (isRecalibrating) return;

        const scrollTop = viewport.scrollTop;
        
        // Map pixel scroll position to an estimated BigInt profile index shift
        // Using proportional mapping across the scroll range
        const scrollRatio = containerHeight > viewportHeight ? scrollTop / (containerHeight - viewportHeight) : 0;
        
        // Approximate tracking index calculation based on scroll offset ratio
        // For maximum safety with huge scales, map ratio against an expansive range pointer.
        // Let's compute target starting index based on ratio:
        const maxDisplayableRange = 1000000000n; // 1 billion logical items span inside scroll range natively
        let targetIndex = 1n + BigInt(Math.floor(scrollRatio * Number(maxDisplayableRange)));
        
        // Keep within valid bounds [1n, TOTAL_LOGICAL_PROFILES]
        if (targetIndex < 1n) targetIndex = 1n;
        if (targetIndex > TOTAL_LOGICAL_PROFILES - BigInt(visibleCardCount)) {
            targetIndex = TOTAL_LOGICAL_PROFILES - BigInt(visibleCardCount);
            if (targetIndex < 1n) targetIndex = 1n;
        }

        currentTopIndex = targetIndex;

        // Clear existing children from active DOM container and recycle them
        while (cardContainer.firstChild) {
            recycleCardElement(cardContainer.firstChild);
        }

        // Render the strict window of required DOM nodes
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < visibleCardCount; i++) {
            const profileIndex = currentTopIndex + BigInt(i);
            if (profileIndex > TOTAL_LOGICAL_PROFILES) break;

            const data = generateProfileData(profileIndex);
            const card = getOrCreateCardElement();

            // Populate deterministic data into card template
            card.querySelector('.avatar-wrapper').innerHTML = data.avatarSvg;
            card.querySelector('.profile-title').textContent = data.name;
            card.querySelector('.profile-handle').textContent = data.handle;
            card.querySelector('.profile-profession').textContent = data.profession;
            card.querySelector('.location-text').textContent = data.location;
            card.querySelector('.profile-bio').textContent = data.bio;
            
            // Populate Tags
            const tagsContainer = card.querySelector('.tags-container');
            tagsContainer.innerHTML = '';
            data.interests.forEach(tagText => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tagText;
                tagsContainer.appendChild(tagEl);
            });

            card.querySelector('.followers-val').textContent = data.stats.followers;
            card.querySelector('.following-val').textContent = data.stats.following;
            card.querySelector('.posts-val').textContent = data.stats.posts;

            fragment.appendChild(card);
        }

        cardContainer.appendChild(fragment);

        // Position the card container matching current scroll offset alignment
        // This creates a seamless infinite window illusion.
        const translateY = scrollTop - (scrollTop % CARD_HEIGHT_ESTIMATE);
        cardContainer.style.transform = `translateY(${translateY}px)`;

        // Update header badge status indicator efficiently
        currentBadge.textContent = `Puja ${currentTopIndex.toLocaleString()}`;
    }

    // Throttled scroll listener via requestAnimationFrame
    let ticking = false;
    viewport.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                renderVirtualWindow();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // --- JUMP / TELEPORT FEATURE ---
    function jumpToProfile(targetBigInt) {
        if (targetBigInt < 1n) targetBigInt = 1n;
        if (targetBigInt > TOTAL_LOGICAL_PROFILES) targetBigInt = TOTAL_LOGICAL_PROFILES;

        isRecalibrating = true;
        currentTopIndex = targetBigInt;

        // Reset scroll position proportionally
        const maxDisplayableRange = 1000000000n;
        const ratio = Number(targetBigInt) / Number(maxDisplayableRange);
        const targetScrollTop = ratio * (containerHeight - viewportHeight);
        
        viewport.scrollTop = isNaN(targetScrollTop) ? 0 : targetScrollTop;

        isRecalibrating = false;
        renderVirtualWindow();
    }

    // Modal Interactions
    jumpBtn.addEventListener('click', () => {
        jumpInput.value = currentTopIndex.toString();
        jumpModal.classList.remove('hidden');
        jumpInput.focus();
    });

    modalCancel.addEventListener('click', () => {
        jumpModal.classList.add('hidden');
    });

    modalConfirm.addEventListener('click', () => {
        try {
            const rawVal = jumpInput.value.replace(/,/g, '').trim();
            if (rawVal) {
                const parsed = BigInt(rawVal);
                jumpToProfile(parsed);
                jumpModal.classList.add('hidden');
            }
        } catch (e) {
            alert('Please enter a valid integer profile number.');
        }
    });

    jumpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            modalConfirm.click();
        } else if (e.key === 'Escape') {
            modalCancel.click();
        }
    });

    // --- INITIALIZATION ---
    window.addEventListener('resize', () => {
        updateVirtualDimensions();
        renderVirtualWindow();
    });

    // Boot execution
    updateVirtualDimensions();
    renderVirtualWindow();

})();
