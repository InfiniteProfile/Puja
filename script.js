/* PUJA — Infinite Profile Generator
 * Every profile is a pure function of its BigInt number.
 * The page keeps only a small, fixed ring of cards in the DOM and recycles them while scrolling. */
(() => {
  'use strict';

  if (typeof BigInt !== 'function') {
    const n = document.getElementById('unsupported');
    if (n) n.hidden = false;
    return;
  }

  /* ================= Profile generation (pure, deterministic) ================= */

  const PLACES = ['Kolkata, India','Jaipur, India','Pune, India','Kochi, India','Lisbon, Portugal','Porto, Portugal','Kyoto, Japan','Osaka, Japan','Seoul, South Korea','Singapore','Bangkok, Thailand','Hanoi, Vietnam','Nairobi, Kenya','Accra, Ghana','Cape Town, South Africa','Marrakesh, Morocco','Cairo, Egypt','Istanbul, Türkiye','Athens, Greece','Naples, Italy','Florence, Italy','Vienna, Austria','Prague, Czechia','Copenhagen, Denmark','Reykjavik, Iceland','Edinburgh, Scotland','Dublin, Ireland','Lyon, France','Seville, Spain','Amsterdam, Netherlands','Toronto, Canada','Montréal, Canada','Mexico City, Mexico','Oaxaca, Mexico','Bogotá, Colombia','Lima, Peru','Buenos Aires, Argentina','São Paulo, Brazil','Santiago, Chile','Austin, USA','Portland, USA','New Orleans, USA','Savannah, USA','Sydney, Australia','Melbourne, Australia','Wellington, New Zealand','Dubai, UAE','Tbilisi, Georgia'];

  const JOBS = ['Clockmaker','Bookbinder','Marine biologist','Luthier','Cartographer','Pastry chef','Architect','Botanist','Glassblower','Radio host','Astronomer','Textile designer','Potter','Sound engineer','Pediatric nurse','Urban planner','Calligrapher','Beekeeper','Chemist','Violinist','Tailor','Archivist','Landscape painter','Sailmaker','Perfumer','Film editor','Linguist','Ceramicist','Mountain guide','Furniture maker','Illustrator','Seismologist','Tea blender','Typographer','Piano tuner','Veterinarian','Jeweller','Journalist','Choreographer','Ornithologist','Stonemason','Chocolatier','Game designer','Paleontologist','Sommelier','Set designer','Translator','Gardener'];

  const INTERESTS = ['Monsoon walks','Vinyl records','Chess endgames','Night markets','Slow cooking','Stargazing','Sketching','Old maps','Jazz','Street photography','Bird watching','Embroidery','Cycling','Tea ceremonies','Pottery','Poetry','Sailing','Foraging','Mythology','Film noir','Calligraphy','Rock climbing','Fermentation','Letterpress','Origami','Opera','Antique clocks','Folk songs','Mountain trails','Board games','Kite flying','Marathon training','Weaving','Rare plants','Typewriters','Classical dance','Sourdough','Tide pools','Handwritten letters','Rainy afternoons','Language learning','Vintage cameras','Woodcarving','Spice blending','Ink and quill','Observatories','Lantern festivals','Salt flats','Mosaic art','Podcasts','Puppet theatre','Cooking for friends','Scrapbooking','Oral histories','Harbour sunsets','Crosswords','Bookshops','Wild swimming','Kitchen gardens','Brass bands','Paper marbling','Architecture walks','Chai stalls','Lighthouses'];

  const OPENERS = ['Happiest when lost in','Forever chasing','Quietly obsessed with','Collects stories about','Weekends belong to','Always making time for','Finds calm in','Rarely seen without','Currently deep into','Believes in'];

  const CLOSERS = ['Ask about the long way home.','Tea first, then everything else.','Always up for a good detour.','Notes everything in the margins.','Keeps a candle lit for late-night talks.','Will trade recipes for stories.','Collecting small wonders, one day at a time.','Soft spoken, sharp memory.','Says yes to sunrise plans.','Writes the good ideas down.','Happily offline on Sundays.','Open to a conversation anytime.'];

  const PALETTES = [
    { c1: '#7b1e2b', c2: '#c4586a', rgb: '123, 30, 43' },  // burgundy
    { c1: '#4b2a7a', c2: '#9570cc', rgb: '75, 42, 122' },   // royal purple
    { c1: '#1c3f7a', c2: '#5b8bd0', rgb: '28, 63, 122' },   // deep blue
    { c1: '#0f6b4f', c2: '#43b38a', rgb: '15, 107, 79' },   // emerald
    { c1: '#7a560f', c2: '#d9ac3f', rgb: '122, 86, 15' },   // antique gold
    { c1: '#8a3a14', c2: '#d8814a', rgb: '138, 58, 20' }    // copper
  ];

  const SKIN = ['#f3d2b3', '#e8b98d', '#d49b6a', '#b97a4c', '#94593a', '#6e3f27'];
  const HAIR = ['#1d1410', '#3a2416', '#5a3a22', '#8a5a2b', '#b8863b', '#2c2c3a', '#7a2a2a', '#c9c1b0'];
  const CLOTH = ['#2b1d3f', '#14305e', '#0b4a38', '#5e1520', '#3a2a18', '#222a35', '#7a3a12', '#1e4a55'];
  const GOLD = '#d9ae45';
  const DARK = '#2b1a12';
  const LIP = '#b8324a';

  /* 128-bit hash of a BigInt, folded 32 bits at a time (cyrb128 style). Works for any size. */
  function seedFrom(n) {
    const hex = n.toString(16);
    const s = hex.padStart(Math.ceil(hex.length / 8) * 8, '0');
    let h1 = 0x243f6a88, h2 = 0x85a308d3, h3 = 0x13198a2e, h4 = 0x03707344;
    for (let i = 0; i < s.length; i += 8) {
      const k = parseInt(s.substr(i, 8), 16) | 0;
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 ^= s.length; h2 ^= s.length >>> 3;
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }

  /* sfc32: integer-only PRNG, identical on every engine. */
  function makeRng(a, b, c, d) {
    const next = () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
    for (let i = 0; i < 15; i++) next();
    return next;
  }

  function avatarSvg(pick, r, pal) {
    const skin = pick(SKIN), hair = pick(HAIR), cloth = pick(CLOTH);
    const style = (r() * 5) | 0, acc = (r() * 4) | 0, mouth = (r() * 3) | 0;
    const sx = 20 + ((r() * 60) | 0), sy = 14 + ((r() * 26) | 0), sr = 10 + ((r() * 14) | 0);
    const brow = style === 4 ? DARK : hair;

    let s = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
    s += `<rect width="100" height="100" fill="${pal.c2}"/>`;
    s += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#fff" opacity=".16"/>`;
    s += '<path d="M0 80Q30 62 55 74T100 68V100H0Z" fill="#000" opacity=".12"/>';
    if (style === 0) s += `<path d="M28 52C23 24 40 15 50 15S77 24 72 52C73 62 70 68 66 70L34 70C30 68 27 62 28 52Z" fill="${hair}"/>`;
    if (style === 1) s += `<path d="M29 48C24 22 40 14 50 14S76 22 71 48C73 64 70 76 66 84L34 84C30 76 27 64 29 48Z" fill="${hair}"/>`;
    s += `<path d="M10 100C12 78 30 70 50 70S88 78 90 100Z" fill="${cloth}"/>`;
    s += `<rect x="43" y="56" width="14" height="19" rx="6" fill="${skin}"/>`;
    s += '<rect x="43" y="56" width="14" height="9" rx="4" fill="#000" opacity=".12"/>';
    s += `<path d="M41 71L50 82L59 71" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<circle cx="33" cy="48" r="3.3" fill="${skin}"/><circle cx="67" cy="48" r="3.3" fill="${skin}"/>`;
    s += `<ellipse cx="50" cy="46" rx="17" ry="20" fill="${skin}"/>`;

    if (style === 2) s += `<path d="M32 46C29 24 43 17 50 17S71 24 68 46C65 36 58 31 50 31S35 36 32 46Z" fill="${hair}"/><circle cx="50" cy="13" r="8.5" fill="${hair}"/>`;
    if (style === 0 || style === 1) s += `<path d="M32 44C34 26 66 26 68 44C62 34 52 33 46 34C40 35 35 38 32 44Z" fill="${hair}"/>`;
    if (style === 3) {
      s += `<g fill="${hair}"><circle cx="38" cy="30" r="9"/><circle cx="46" cy="25" r="9"/><circle cx="54" cy="25" r="9"/><circle cx="62" cy="30" r="9"/><circle cx="33" cy="38" r="7"/><circle cx="67" cy="38" r="7"/><circle cx="50" cy="29" r="9"/></g>`;
    }
    if (style === 4) {
      s += `<path d="M31 42C29 17 71 17 69 42C60 35 40 35 31 42Z" fill="${GOLD}"/>`;
      s += '<path d="M33 35Q50 28 67 35" fill="none" stroke="#fff" stroke-width="1.5" opacity=".45"/>';
    }

    s += `<path d="M38.5 41.5Q43 39 47 41M53 41Q57 39 61.5 41.5" fill="none" stroke="${brow}" stroke-width="1.7" stroke-linecap="round"/>`;
    s += `<circle cx="43" cy="47" r="1.7" fill="${DARK}"/><circle cx="57" cy="47" r="1.7" fill="${DARK}"/>`;
    s += `<path d="M40.6 45.6L39.2 44.6M42 44.6L41.4 43.2M59.4 45.6L60.8 44.6M58 44.6L58.6 43.2" stroke="${DARK}" stroke-width=".9" stroke-linecap="round"/>`;
    s += '<circle cx="39" cy="53" r="3.4" fill="#e0524a" opacity=".16"/><circle cx="61" cy="53" r="3.4" fill="#e0524a" opacity=".16"/>';
    if (mouth === 0) s += `<path d="M44 54Q50 60 56 54" fill="none" stroke="${LIP}" stroke-width="2" stroke-linecap="round"/>`;
    else if (mouth === 1) s += `<path d="M45 55Q50 58 55 55" fill="none" stroke="${LIP}" stroke-width="2" stroke-linecap="round"/>`;
    else s += `<path d="M44 54.5Q50 57 56 54" fill="none" stroke="${LIP}" stroke-width="2" stroke-linecap="round"/>`;

    s += `<circle cx="32.6" cy="54" r="1.9" fill="${GOLD}"/><circle cx="67.4" cy="54" r="1.9" fill="${GOLD}"/>`;
    if (acc === 1) s += `<g fill="none" stroke="${DARK}" stroke-width="1.4"><circle cx="43" cy="47" r="5.4"/><circle cx="57" cy="47" r="5.4"/><path d="M48.4 47H51.6"/></g>`;
    else if (acc === 2) s += `<circle cx="50" cy="83" r="2.5" fill="${GOLD}" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>`;
    return s + '</svg>';
  }

  function compact(v) {
    if (v < 1000) return String(v);
    if (v < 1e6) { const x = v / 1000; return (x < 10 ? x.toFixed(1).replace(/\.0$/, '') : String(Math.round(x))) + 'K'; }
    const x = v / 1e6;
    return (x < 10 ? x.toFixed(1).replace(/\.0$/, '') : String(Math.round(x))) + 'M';
  }

  /** Same BigInt in → same profile out. Integer math only, so it matches across devices. */
  function makeProfile(n) {
    const r = makeRng.apply(null, seedFrom(n));
    const pick = (arr) => arr[(r() * arr.length) | 0];
    const pal = pick(PALETTES);
    const job = pick(JOBS);
    const loc = pick(PLACES);

    const pool = INTERESTS.slice();
    const count = 3 + ((r() * 2) | 0);
    const interests = [];
    for (let i = 0; i < count; i++) {
      const j = i + ((r() * (pool.length - i)) | 0);
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      interests.push(pool[i]);
    }
    const bio = `${job} by trade. ${pick(OPENERS)} ${interests[0].toLowerCase()} and ${interests[1].toLowerCase()}. ${pick(CLOSERS)}`;

    const followers = (100 + ((r() * 900) | 0)) * [1, 10, 100, 1000][(r() * 4) | 0];
    const following = (20 + ((r() * 980) | 0)) * [1, 1, 10][(r() * 3) | 0];
    const posts = (8 + ((r() * 500) | 0)) * (r() < 0.3 ? 4 : 1);

    return {
      pal, job, loc, interests, bio,
      stats: [compact(followers), compact(following), compact(posts)],
      avatar: avatarSvg(pick, r, pal)
    };
  }

  /* ==== UI ==== */

  const BUF = 3;            // cards kept above the viewport
  const MAX_W = 28;         // hard cap on cards in the DOM
  const MAX_DIGITS = 100000;
  const CACHE_MAX = 64;

  const $ = (id) => document.getElementById(id);
  const vp = $('viewport'), track = $('track'), nowEl = $('now');
  const form = $('jump-form'), input = $('jump-input'), errEl = $('jump-error');
  const btnPrev = $('btn-prev'), btnNext = $('btn-next'), btnCopy = $('btn-copy'), btnShare = $('btn-share');
  const toastEl = $('toast');
  const reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ---- small LRU cache of generated profiles ---- */
  const cache = new Map();
  function getProfile(n, s) {
    let p = cache.get(s);
    if (p) { cache.delete(s); cache.set(s, p); return p; }
    p = makeProfile(n);
    cache.set(s, p);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return p;
  }

  function short(s, max) {
    if (s.length <= max) return s;
    const head = Math.ceil((max - 1) / 2), tail = Math.floor((max - 1) / 2);
    return s.slice(0, head) + '…' + s.slice(s.length - tail);
  }

  /* ---- DOM pool ---- */
  function createSlot() {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML =
      '<article class="card">' +
        '<div class="banner"><div class="avatar"><span class="ring"></span><span class="portrait"></span></div></div>' +
        '<div class="body">' +
          '<h2 class="name"></h2>' +
          '<p class="idnote" hidden></p>' +
          '<p class="meta"><span class="job"></span><span class="loc"></span></p>' +
          '<p class="bio"></p>' +
          '<ul class="chips"><li></li><li></li><li></li><li></li></ul>' +
          '<dl class="stats"><div><dt>Followers</dt><dd></dd></div><div><dt>Following</dt><dd></dd></div><div><dt>Posts</dt><dd></dd></div></dl>' +
        '</div>' +
      '</article>';
    const q = (sel) => slot.querySelector(sel);
    slot._r = {
      card: q('.card'), portrait: q('.portrait'), name: q('.name'), note: q('.idnote'),
      job: q('.job'), loc: q('.loc'), bio: q('.bio'),
      chips: slot.querySelectorAll('.chips li'), stats: slot.querySelectorAll('.stats dd')
    };
    slot._s = '';
    slot._p = null;
    return slot;
  }

  function fill(slot, n) {
    const s = n.toString();
    if (slot._s === s) return;
    slot._s = s;
    const p = getProfile(n, s);
    slot._p = p;
    const r = slot._r;
    const L = s.length;

    r.card.style.setProperty('--ac1', p.pal.c1);
    r.card.style.setProperty('--ac2', p.pal.c2);
    r.card.style.setProperty('--ac1-rgb', p.pal.rgb);
    r.card.setAttribute('aria-label', 'Puja ' + (L <= 200 ? s : short(s, 40)));
    if (L > 40) r.card.setAttribute('data-long', ''); else r.card.removeAttribute('data-long');
    if (L > 200) r.card.setAttribute('data-huge', ''); else r.card.removeAttribute('data-huge');

    /* The full, exact number is always shown. Long numbers get smaller type; very long ones scroll inside the card. */
    r.name.textContent = 'Puja ' + s;
    r.name.dataset.size = L <= 7 ? '1' : L <= 12 ? '2' : L <= 20 ? '3' : L <= 40 ? '4' : L <= 80 ? '5' : L <= 200 ? '6' : '7';
    if (L > 200) r.name.setAttribute('tabindex', '0'); else r.name.removeAttribute('tabindex');
    r.name.scrollTop = 0;
    if (L > 40) { r.note.textContent = L.toLocaleString() + ' digits'; r.note.hidden = false; }
    else r.note.hidden = true;

    r.job.textContent = p.job;
    r.loc.textContent = p.loc;
    r.bio.textContent = p.bio;
    for (let i = 0; i < r.chips.length; i++) {
      const t = p.interests[i];
      if (t) { r.chips[i].textContent = t; r.chips[i].hidden = false; } else r.chips[i].hidden = true;
    }
    for (let i = 0; i < 3; i++) r.stats[i].textContent = p.stats[i];
    r.portrait.innerHTML = p.avatar;
  }

  /* ---- state ---- */
  let base = 1n;      // number of the first card in the DOM
  let W = 0;          // cards in the DOM
  let H = 0, pitch = 0, gap = 0, cardH = 0, wide = false;
  let curNode = null, curIdx = 0, curStr = '', curBig = 1n, curProfile = null;
  let raf = 0, rlRaf = 0, urlTimer = 0, urlStr = '', toastTimer = 0;
  let anim = 0, shiftAcc = 0;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function clearCur() {
    if (curNode) { curNode.classList.remove('is-current'); curNode = null; }
  }

  function fillAll() {
    const kids = track.children;
    let n = base;
    for (let i = 0; i < kids.length; i++) { fill(kids[i], n); n += 1n; }
  }

  /* Scroll offset that presents card `i` nicely (centered, or top-aligned if taller than the viewport). */
  function topFor(i) {
    const cardTop = i * pitch + gap / 2;
    return cardH <= H ? cardTop - (H - cardH) / 2 : cardTop - 8;
  }

  /* Remove k cards at the top, recycle them at the bottom. Scroll offset is corrected in the same task. */
  function shiftDown(k) {
    let n = base + BigInt(W);
    for (let i = 0; i < k; i++) {
      const node = track.firstElementChild;
      if (node === curNode) clearCur();
      fill(node, n); n += 1n;
      track.appendChild(node);
    }
    base += BigInt(k);
    vp.scrollTop -= k * pitch;
    shiftAcc -= k * pitch;
  }

  /* Recycle k cards from the bottom to the top. */
  function shiftUp(k) {
    let n = base - 1n;
    for (let i = 0; i < k; i++) {
      const node = track.lastElementChild;
      if (node === curNode) clearCur();
      fill(node, n); n -= 1n;
      track.insertBefore(node, track.firstElementChild);
    }
    base -= BigInt(k);
    vp.scrollTop += k * pitch;
    shiftAcc += k * pitch;
  }

  function sync() {
    raf = 0;
    const st = vp.scrollTop;
    if (st >= 0 && st <= vp.scrollHeight - vp.clientHeight + 1) {   // ignore rubber-band overscroll
      const above = Math.floor(st / pitch);
      if (above >= BUF + 2) {
        shiftDown(clamp(above - BUF, 1, W - 1));
      } else if (above <= BUF - 2 && base > 1n) {
        const room = base > BigInt(BUF) ? BUF : Number(base - 1n);
        const k = Math.min(BUF - above, room);
        if (k > 0) shiftUp(k);
      }
    }
    updateCurrent();
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(sync); }

  function updateCurrent() {
    let idx = Math.floor((vp.scrollTop + H / 2) / pitch);
    idx = clamp(idx, 0, W - 1);
    const node = track.children[idx];
    if (!node) return;
    curIdx = idx;
    curBig = base + BigInt(idx);
    if (node === curNode) return;
    if (curNode) curNode.classList.remove('is-current');
    curNode = node;
    node.classList.add('is-current');
    curStr = node._s;
    curProfile = node._p;

    nowEl.textContent = 'Puja ' + curStr;
    nowEl.parentNode.classList.toggle('long', curStr.length > 14);
    nowEl.dataset.size = curStr.length <= 14 ? '1' : curStr.length <= 60 ? '2' : '3';
    nowEl.scrollTop = 0;
    document.title = 'Puja ' + short(curStr, 30) + ' — PUJA Infinite Profile Generator';
    btnPrev.disabled = curStr === '1';

    if (curStr !== urlStr) {
      clearTimeout(urlTimer);
      urlTimer = setTimeout(writeUrl, 300);
    }
  }

  /* ---- sizing ---- */
  function measure() {
    const h = vp.clientHeight, w = vp.clientWidth;
    const isWide = w >= 720;
    let g, ch;
    if (isWide) { g = 28; ch = clamp(Math.round((h * 0.8) / 8) * 8, 340, 460); }
    else { g = 20; ch = clamp(Math.round((h * 0.9) / 8) * 8, 520, 680); }
    return { H: h, wide: isWide, gap: g, cardH: ch, pitch: ch + g };
  }

  function playEnter(centerIdx) {
    if (reduceMq.matches) return;
    const kids = track.children;
    for (let i = 0; i < kids.length; i++) {
      kids[i].style.setProperty('--i', Math.min(Math.abs(i - centerIdx), 4));
      kids[i].classList.remove('enter');
    }
    void track.offsetWidth;
    for (let i = 0; i < kids.length; i++) kids[i].classList.add('enter');
  }

  track.addEventListener('animationend', (e) => {
    if (e.animationName === 'pop') {
      const slot = e.target.closest && e.target.closest('.slot');
      if (slot) slot.classList.remove('enter');
    }
  });

  function relayout(first, startN) {
    const m = measure();
    if (m.H <= 0 || vp.clientWidth <= 0) return;
    const nW = Math.min(Math.ceil(m.H / m.pitch) + 1 + 2 * BUF, MAX_W);
    if (!first && m.pitch === pitch && m.wide === wide && nW === W) { H = m.H; schedule(); return; }

    let anchor, frac = 0.5;
    if (first) anchor = startN;
    else {
      const pos = (vp.scrollTop + H / 2) / pitch;
      const idx = clamp(Math.floor(pos), 0, W - 1);
      frac = pos - idx;
      anchor = base + BigInt(idx);
    }

    cancelAnim();
    H = m.H; pitch = m.pitch; gap = m.gap; cardH = m.cardH; wide = m.wide; W = nW;
    vp.dataset.layout = wide ? 'wide' : 'tall';
    vp.style.setProperty('--card-h', cardH + 'px');
    vp.style.setProperty('--gap', gap + 'px');
    vp.style.setProperty('--pitch', pitch + 'px');

    while (track.children.length < W) track.appendChild(createSlot());
    while (track.children.length > W) track.removeChild(track.lastElementChild);

    clearCur();
    base = anchor > BigInt(BUF) ? anchor - BigInt(BUF) : 1n;
    const off = Number(anchor - base);
    fillAll();
    if (first) { vp.scrollTop = Math.max(0, topFor(off)); playEnter(off); }
    else vp.scrollTop = Math.max(0, (off + frac) * pitch - H / 2);
    updateCurrent();
  }

  function scheduleRelayout() {
    if (!rlRaf) rlRaf = requestAnimationFrame(() => { rlRaf = 0; relayout(false); });
  }

  /* ---- jumping & stepping ---- */
  function jumpTo(n) {
    cancelAnim();
    base = n > BigInt(BUF) ? n - BigInt(BUF) : 1n;
    const off = Number(n - base);
    clearCur();
    fillAll();
    vp.scrollTop = Math.max(0, topFor(off));
    playEnter(off);
    updateCurrent();
  }

  function cancelAnim() { if (anim) { cancelAnimationFrame(anim); anim = 0; } }

  function stepBy(dir) {
    if (dir < 0 && curBig <= 1n) return;
    const target = Math.max(0, topFor(curIdx + dir));
    const dist = target - vp.scrollTop;
    if (reduceMq.matches || Math.abs(dist) < 1) { cancelAnim(); vp.scrollTop = target; schedule(); return; }
    cancelAnim();
    const startTop = vp.scrollTop, accStart = shiftAcc, t0 = performance.now(), dur = 380;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      vp.scrollTop = Math.round(startTop + (shiftAcc - accStart) + dist * e);
      anim = p < 1 ? requestAnimationFrame(tick) : 0;
    };
    anim = requestAnimationFrame(tick);
  }

  /* ---- input parsing ---- */
  function parseNumber(raw) {
    let s = String(raw == null ? '' : raw).trim().replace(/^puja\s*/i, '').replace(/[\s,_'’]/g, '');
    if (!s) return { error: 'Enter a Puja number, like 5000 or 98765432101234567890.' };
    if (!/^\d+$/.test(s)) return { error: 'Use whole numbers only, like 5000 or 98765432101234567890.' };
    s = s.replace(/^0+(?=\d)/, '');
    if (s === '0') return { error: 'Puja numbers start at 1.' };
    if (s.length > MAX_DIGITS) return { error: 'That number is too long. The limit is ' + MAX_DIGITS.toLocaleString() + ' digits.' };
    return { n: BigInt(s), s };
  }

  function showError(msg) {
    errEl.textContent = msg; errEl.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  }
  function clearError() {
    errEl.hidden = true; errEl.textContent = '';
    input.removeAttribute('aria-invalid');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const res = parseNumber(input.value);
    if (res.error) { showError(res.error); input.focus(); return; }
    clearError();
    input.value = '';
    input.blur();
    jumpTo(res.n);
  });
  input.addEventListener('input', () => { if (!errEl.hidden) clearError(); });

  /* ---- URL state (?puja=N) ---- */
  function urlFor(s) {
    try {
      const u = new URL(location.href);
      u.search = ''; u.hash = '';
      u.searchParams.set('puja', s);
      return u.toString();
    } catch (e) { return location.href; }
  }
  function writeUrl() {
    urlTimer = 0;
    if (!curStr || curStr === urlStr) return;
    try { history.replaceState(history.state, '', urlFor(curStr)); urlStr = curStr; } catch (e) { /* e.g. file:// */ }
  }
  function readUrl() {
    try {
      const v = new URLSearchParams(location.search).get('puja');
      if (v == null) return null;
      const res = parseNumber(v);
      return res.error ? null : res;
    } catch (e) { return null; }
  }
  window.addEventListener('popstate', () => {
    const res = readUrl();
    if (res && res.s !== curStr) { urlStr = res.s; jumpTo(res.n); }
  });

  /* ---- copy / share ---- */
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
  }

  async function copyText(t) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; }
    } catch (e) { /* fall through */ }
    const active = document.activeElement;
    try {
      const ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, t.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
    finally { if (active && active.focus) active.focus(); }
  }

  function shareParts() {
    const s = curStr, p = curProfile;
    const label = 'Puja ' + (s.length <= 300 ? s : short(s, 60));
    const text = label + (p ? ' — ' + p.job + ', ' + p.loc : '');
    return { text, url: urlFor(s), title: label };
  }

  btnCopy.addEventListener('click', async () => {
    const { text, url } = shareParts();
    toast((await copyText(text + '\n' + url)) ? 'Link copied' : 'Couldn\u2019t copy. Copy the address bar link instead.');
  });

  if (navigator.share) {
    btnShare.hidden = false;
    btnShare.addEventListener('click', async () => {
      const { text, url, title } = shareParts();
      try { await navigator.share({ title, text, url }); }
      catch (e) { if (!e || e.name !== 'AbortError') toast((await copyText(text + '\n' + url)) ? 'Link copied' : 'Sharing isn\u2019t available here.'); }
    });
  }

  btnPrev.addEventListener('click', () => stepBy(-1));
  btnNext.addEventListener('click', () => stepBy(1));

  /* ---- keyboard on the scroller ---- */
  vp.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target !== vp) return;
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); stepBy(1); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); stepBy(-1); }
    else if (e.key === 'Home') { e.preventDefault(); jumpTo(1n); }
  });

  /* ---- scrolling ---- */
  vp.addEventListener('scroll', schedule, { passive: true });
  vp.addEventListener('wheel', cancelAnim, { passive: true });
  vp.addEventListener('touchstart', cancelAnim, { passive: true });
  vp.addEventListener('pointerdown', cancelAnim, { passive: true });

  if (typeof ResizeObserver === 'function') new ResizeObserver(scheduleRelayout).observe(vp);
  window.addEventListener('resize', scheduleRelayout, { passive: true });
  window.addEventListener('orientationchange', scheduleRelayout, { passive: true });

  /* ---- start ---- */
  const initial = readUrl();
  if (initial) urlStr = ''; // let the first sync normalise the URL
  relayout(true, initial ? initial.n : 1n);
})();
