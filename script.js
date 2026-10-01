(() => {
  'use strict';
  const CARD_HEIGHT = 365, GAP = 16, STRIDE = CARD_HEIGHT + GAP;
  const REGION_ROWS = 4000, ANCHOR_ROW = 2000, BUFFER = 4, MIN_ID = 1n;
  const POOL_SIZE = 17;
  const viewport = document.getElementById('scrollViewport');
  const pool = document.getElementById('cardPool');
  const topSpacer = document.getElementById('topSpacer');
  const bottomSpacer = document.getElementById('bottomSpacer');
  const template = document.getElementById('cardTemplate');
  const jumpInput = document.getElementById('jumpInput');
  const jumpButton = document.getElementById('jumpButton');
  const current = document.getElementById('currentPosition');
  const dialog = document.getElementById('profileDialog');
  const dialogContent = document.getElementById('dialogContent');
  const toast = document.getElementById('toast');
  let logicalAnchor = 1n, renderedStart = -1n, ticking = false, toastTimer;
  const cards = [];
  const locations = ['Dhaka, Bangladesh','Kolkata, India','London, United Kingdom','Melbourne, Australia','Toronto, Canada','Singapore','Kathmandu, Nepal','New York, United States','Kyoto, Japan','Lisbon, Portugal','Mumbai, India','Copenhagen, Denmark'];
  const professions = ['Creative Director','Architect','Researcher','Product Designer','Writer','Photographer','Data Analyst','Curator','Software Engineer','Founder','Musician','Urban Planner'];
  const interests = ['Typography','Cinema','Travel','Design','Literature','Astronomy','Coffee','Gardens','Architecture','Chess','Textiles','Music','Museums','Cooking','Languages','Film'];
  const bios = ['Collecting small moments and making room for generous ideas.','Quietly building a life with curiosity, craft, and intention.','Finding elegant answers to interesting everyday questions.','Observer of cities, stories, and the details in between.','Making thoughtful work and keeping a well-marked notebook.','Drawn to good light, long walks, and better conversations.'];
  const palettes = [['#c8a267','#44331e'],['#8ba9a6','#253a39'],['#b88d99','#482e35'],['#9a9ac6','#33334e'],['#be976d','#493728'],['#8fa879','#30422e']];
  function format(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function hashBigInt(n, salt) { let x = n ^ BigInt(salt); x ^= x >> 30n; x *= 0xbf58476d1ce4e5b9n; x ^= x >> 27n; x *= 0x94d049bb133111ebn; x ^= x >> 31n; return x & 0xffffffffn; }
  function pick(n, salt, arr) { return arr[Number(hashBigInt(n,salt) % BigInt(arr.length))]; }
  function range(n, salt, min, max) { return min + Number(hashBigInt(n,salt) % BigInt(max-min+1)); }
  function compact(n) { const units=['','K','M','B','T','Q']; let v=n, i=0; while(v>=1000 && i<units.length-1){v/=1000;i++;} return (v>=100 ? Math.round(v) : v.toFixed(v>=10?1:2).replace(/\.0+$/,''))+units[i]; }
  function profile(n) {
    const palette = pick(n,7,palettes), hue=Number(hashBigInt(n,11)%360n), initial='P';
    return { n, accent:palette[0], name:`Puja ${format(n)}`, handle:`@Puja${n.toString()}`, location:pick(n,13,locations), profession:pick(n,17,professions), bio:pick(n,19,bios), tags:[pick(n,23,interests),pick(n,29,interests),pick(n,31,interests)].filter((v,i,a)=>a.indexOf(v)===i), followers:compact(range(n,37,245,9854321)), following:range(n,41,32,982).toLocaleString(), posts:range(n,43,1,8429).toLocaleString(), palette, hue, initial };
  }
  function avatar(p) { const h1=p.hue,h2=(p.hue+44)%360,h3=(p.hue+190)%360; const seed=Number(hashBigInt(p.n,47)%100n); return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" fill="hsl(${h1} 29% 22%)"/><circle cx="${20+seed%36}" cy="${18+seed%20}" r="27" fill="hsl(${h2} 38% 41%)" opacity=".82"/><path d="M0 ${52+seed%18} Q22 ${31+seed%15} 43 ${58-seed%13} T80 ${42+seed%21}V80H0Z" fill="hsl(${h3} 25% 16%)"/><text x="40" y="51" text-anchor="middle" fill="#fff7e7" font-family="Georgia,serif" font-size="29">${p.initial}</text></svg>`; }
  function fillCard(card,n) { const p=profile(n); card.dataset.id=n.toString(); card.style.setProperty('--accent',p.accent); card.querySelector('.sequence').textContent=`Profile No. ${format(n)}`; card.querySelector('.avatar').innerHTML=avatar(p); card.querySelector('.name').textContent=p.name; card.querySelector('.handle').textContent=p.handle; card.querySelector('.bio').textContent=p.bio; card.querySelector('.location').textContent=p.location; card.querySelector('.profession').textContent=p.profession; card.querySelector('.interests').innerHTML=p.tags.map(t=>`<span class="interest">${t}</span>`).join(''); card.querySelector('.followers').textContent=p.followers; card.querySelector('.following').textContent=p.following; card.querySelector('.posts').textContent=p.posts; }
  function makeCards() { for(let i=0;i<POOL_SIZE;i++){ const card=template.content.firstElementChild.cloneNode(true); cards.push(card); pool.appendChild(card); } }
  function maxTop() { return (REGION_ROWS-1)*STRIDE; }
  function localRow() { return Math.max(0,Math.min(REGION_ROWS-1,Math.floor(viewport.scrollTop/STRIDE))); }
  function firstVisibleID() { return logicalAnchor + BigInt(localRow()-ANCHOR_ROW); }
  function render(force=false) { let first=firstVisibleID(); if(first<MIN_ID) first=MIN_ID; let start=first-BigInt(BUFFER); if(start<MIN_ID) start=MIN_ID; if(!force && start===renderedStart) return; renderedStart=start; for(let i=0;i<cards.length;i++) fillCard(cards[i],start+BigInt(i)); const topRows=Number(start-(logicalAnchor-BigInt(ANCHOR_ROW))); topSpacer.style.height=`${Math.max(0,topRows)*STRIDE}px`; const used=topRows+cards.length; bottomSpacer.style.height=`${Math.max(0,REGION_ROWS-used)*STRIDE}px`; pool.setAttribute('aria-busy','false'); }
  function updatePosition() { const id=firstVisibleID()<MIN_ID?MIN_ID:firstVisibleID(); current.innerHTML=`<span>Current profile</span><strong>Puja ${format(id)}</strong>`; }
  function recenterIfNeeded() { const row=localRow(); if((row<260 || row>REGION_ROWS-260) && firstVisibleID()>MIN_ID){ const id=firstVisibleID()<MIN_ID?MIN_ID:firstVisibleID(); logicalAnchor=id; viewport.scrollTop=ANCHOR_ROW*STRIDE; renderedStart=-1n; } }
  function onScroll() { if(ticking) return; ticking=true; requestAnimationFrame(()=>{ticking=false; recenterIfNeeded(); render(); updatePosition();}); }
  function jump(raw) { const cleaned=raw.trim().replace(/[,_\s]/g,''); if(!/^\d+$/.test(cleaned) || cleaned==='0'){ showToast('Enter a positive whole profile number.'); return; } const id=BigInt(cleaned); logicalAnchor=id; renderedStart=-1n; viewport.scrollTop=ANCHOR_ROW*STRIDE; render(true); updatePosition(); jumpInput.value=''; showToast(`Arrived at Puja ${format(id)}.`); viewport.focus({preventScroll:true}); }
  function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);}
  viewport.addEventListener('scroll',onScroll,{passive:true});
  jumpButton.addEventListener('click',()=>jump(jumpInput.value));
  jumpInput.addEventListener('keydown',e=>{if(e.key==='Enter')jump(jumpInput.value);});
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();jump('1');});
  pool.addEventListener('click',e=>{const button=e.target.closest('.view-profile');if(!button)return;const card=button.closest('.profile-card');const id=BigInt(card.dataset.id);const copy=card.cloneNode(true);copy.querySelector('.view-profile').remove();copy.classList.add('dialog-profile'); dialogContent.replaceChildren(copy);dialog.showModal();});
  dialog.addEventListener('click',e=>{if(e.target===dialog || e.target.closest('.close-dialog'))dialog.close();});
  makeCards(); viewport.scrollTop=ANCHOR_ROW*STRIDE; render(true); updatePosition();
})();