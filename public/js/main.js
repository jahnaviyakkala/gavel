let allAuctionsData = [];
let userWatchlist = [];
let currentLayout = localStorage.getItem('gavel-layout') || 'masonry';
window.userWatchlist = userWatchlist;

function getUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    return {
        search: params.get('search') || '',
        category: params.get('category') || '',
        sort: params.get('sort') || 'ending_soon'
    };
}

function syncFilterUrl(query, category, sortVal) {
    if (!window.location.pathname.endsWith('auction.html')) return;
    const params = new URLSearchParams(window.location.search);
    query ? params.set('search', query) : params.delete('search');
    category ? params.set('category', category) : params.delete('category');
    sortVal && sortVal !== 'ending_soon' ? params.set('sort', sortVal) : params.delete('sort');
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
}

document.addEventListener("DOMContentLoaded", async () => {
    const grid = document.getElementById("auction-grid") || document.getElementById("auction-list");
    if (!grid) return;
    
    // Convert old lists to new grid 
    if (grid.id === 'auction-list') {
        grid.id = 'auction-grid';
        grid.className = currentLayout === 'masonry' ? 'masonry-grid' : 'row-grid';
    }

    setLayout(currentLayout, false);
    
    // Inject Amazon-style detail panel if it doesn't exist
    if (!document.getElementById('detail-overlay')) {
        const panelHtml = `
            <div id="detail-overlay" onclick="closeDetail(event)"></div>
            <div id="detail-panel">
                <div id="detail-content" style="padding:0; height:100%; display:flex; flex-direction:column;"></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', panelHtml);
    }

    window.activeTimers = window.activeTimers || [];

    try {
        const [auctionsRes, meRes] = await Promise.all([
            fetch('/api/auctions'),
            fetch('/api/me')
        ]);
        
        if (!auctionsRes.ok) throw new Error('Network response was not ok');
        allAuctionsData = await auctionsRes.json();
        
        const meData = await meRes.json();
        if (meData.loggedIn) {
            try {
                const wRes = await fetch('/api/watchlist');
                const wList = await wRes.json();
                userWatchlist = wList.map(a => a.id);
                window.userWatchlist = userWatchlist;
            } catch(e) {}
        }

        const searchInput = document.getElementById("market-search");
        const filterSelect = document.getElementById("market-filter");
        const sortSelect = document.getElementById("sort-filter");

        const searchBtn = document.getElementById("market-search-btn");
        const initialFilters = getUrlFilters();

        if (searchInput) {
            searchInput.value = initialFilters.search;
            searchInput.addEventListener("input", renderFilteredAuctions);
            searchInput.addEventListener("keydown", (e) => {
                if (e.key === 'Enter') renderFilteredAuctions();
            });
        }
        if (filterSelect) {
            filterSelect.value = initialFilters.category;
            filterSelect.addEventListener("change", renderFilteredAuctions);
        }
        if (sortSelect) {
            sortSelect.value = initialFilters.sort;
            sortSelect.addEventListener("change", renderFilteredAuctions);
        }
        if (searchBtn) searchBtn.addEventListener("click", renderFilteredAuctions);

        renderFilteredAuctions();
        renderShortsFeed(allAuctionsData);
        startTimerLoop();

    } catch (error) {
        console.error("Gavel Client Error:", error);
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background:rgba(255,59,48,0.05); border-radius:12px; border:1px dashed rgba(255,59,48,0.3);">
                <p style="color: var(--neon-red); font-weight: 600;">Unable to connect to the market feeds.</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 15px; padding: 10px 20px; font-size: 0.8rem; background:transparent; border-color:var(--neon-red); color:var(--neon-red);">Retry Connection</button>
            </div>`;
    }
});

// ── Layout toggle ──────────────────────────────────────────────
window.setLayout = function(mode, render = true) {
    currentLayout = mode;
    localStorage.setItem('gavel-layout', mode);

    const grid = document.getElementById('auction-grid');
    const btnMas = document.getElementById('toggle-masonry');
    const btnRow = document.getElementById('toggle-row');
    if (!grid) return;

    if (mode === 'masonry') {
        grid.className = 'masonry-grid';
        if (btnMas) { btnMas.style.background = 'var(--accent-blue)'; btnMas.querySelector('svg').setAttribute('fill','white'); }
        if (btnRow) { btnRow.style.background = 'transparent'; btnRow.querySelector('svg').setAttribute('fill','var(--text-secondary)'); }
    } else {
        grid.className = 'row-grid';
        if (btnRow) { btnRow.style.background = 'var(--accent-blue)'; btnRow.querySelector('svg').setAttribute('fill','white'); }
        if (btnMas) { btnMas.style.background = 'transparent'; btnMas.querySelector('svg').setAttribute('fill','var(--text-secondary)'); }
    }

    if (render && allAuctionsData.length) renderFilteredAuctions();
};

function renderFilteredAuctions() {
    const grid = document.getElementById("auction-grid");
    if (!grid) return;

    grid.innerHTML = "";
    window.activeTimers = [];

    const searchInput = document.getElementById("market-search");
    const filterSelect = document.getElementById("market-filter");
    const sortSelect = document.getElementById("sort-filter");

    const query = searchInput ? searchInput.value.toLowerCase() : "";
    const category = filterSelect ? filterSelect.value : "";
    const sortVal = sortSelect ? sortSelect.value : "ending_soon";
    syncFilterUrl(query, category, sortVal);

    let filtered = allAuctionsData.filter(item => {
        const matchesQuery = !query || item.title.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query));
        const itemCategory = (item.category || '').trim().toLowerCase();
        const matchesCategory = !category || itemCategory === category.trim().toLowerCase();
        return matchesQuery && matchesCategory;
    });

    // Apply Sorting
    filtered.sort((a, b) => {
        if (sortVal === "price_asc") return a.currentBid - b.currentBid;
        if (sortVal === "price_desc") return b.currentBid - a.currentBid;
        if (sortVal === "ending_soon") return new Date(a.endTime) - new Date(b.endTime);
        return 0; // Default
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 50px; text-align: center; color: var(--text-secondary); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
                <p>No markets found matching your criteria.</p>
            </div>`;
        return;
    }

    const isHomepage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/");
    const displayList = isHomepage ? filtered.slice(0, 3) : filtered;

    displayList.forEach(item => {
        const card = currentLayout === 'masonry' ? buildMasonryCard(item) : buildRowCard(item);
        grid.appendChild(card);
        window.activeTimers.push({ el: `timer-${item.id}`, end: new Date(item.endTime).getTime() });
    });
}

function buildMediaArray(item) {
    const images = Array.isArray(item.images) && item.images.length ? item.images : [item.image];
    const media = images.filter(Boolean).map(src => ({ type: 'image', src }));
    const verificationVideo = item.verificationVideo || item.videoUrl;
    if (verificationVideo) media.push({ type: 'video', src: verificationVideo });
    return media;
}

// ── Masonry card ───────────────────────────────────────────────
function buildMasonryCard(item) {
    const media = buildMediaArray(item);
    const div = document.createElement('div');
    div.className = 'masonry-card';
    div.onclick = () => openDetailById(item.id);

    // Give visual variety to the masonry grid heights
    const imageHeight = Math.floor(180 + (item.title.length % 3) * 50);

    const isWatched = userWatchlist.includes(item.id);
    const starColor = isWatched ? 'var(--accent-blue)' : 'rgba(255,255,255,0.4)';

    div.innerHTML = `
        <div class="card-media" style="height:${imageHeight}px;">
            ${!item.verified ? '<span class="unverified-badge">Unverified</span>' : ''}
            <button class="heart-btn" onclick="toggleCardWatchlist(event, '${item.id}', this)" title="${isWatched ? 'Remove Watchlist' : 'Add Watchlist'}" style="color:${starColor}">★</button>
            ${item.hotLabel ? `<span class="unverified-badge" style="right:auto; left:12px; background:rgba(174,36,72,0.14); color:#ffd7df; border-color:rgba(174,36,72,0.35);">${item.hotLabel}</span>` : ''}
            ${media.map((m, i) => m.type === 'image'
                ? `<img src="${m.src}" alt="${item.title}" style="height:${imageHeight}px; display:${i===0?'block':'none'};" data-media-idx="${i}">`
                : `<video src="${m.src}" style="height:${imageHeight}px; display:none; object-fit:cover;" data-media-idx="${i}" muted playsinline></video>`
            ).join('')}
            ${media.length > 1 ? `
                <button class="media-nav prev" onclick="shiftMedia(event,'${item.id}',-1)">&#8249;</button>
                <button class="media-nav next" onclick="shiftMedia(event,'${item.id}',1)">&#8250;</button>
                <div class="media-dots">
                    ${media.map((_,i) => `<span class="media-dot ${i===0?'active':''}" onclick="goToMedia(event,'${item.id}',${i})"></span>`).join('')}
                </div>
            ` : ''}
        </div>
        <div class="card-body">
            <div class="card-title">${item.title}</div>
            <div class="card-bid">₹${item.currentBid.toLocaleString('en-IN')}</div>
            <div class="card-timer" id="timer-${item.id}">Loading...</div>
            <button class="btn-primary" style="width:100%; padding:10px; font-size:0.85rem;" onclick="openDetail(event,'${item.id}')">See More Details</button>
        </div>
    `;
    return div;
}

// ── Row card ───────────────────────────────────────────────────
function buildRowCard(item) {
    const div = document.createElement('div');
    div.className = 'row-card';
    div.onclick = () => openDetailById(item.id);

    const isWatched = userWatchlist.includes(item.id);

    div.innerHTML = `
        <div class="row-img-wrap">
            <img src="${item.image}" alt="${item.title}">
            ${!item.verified ? '<span class="unverified-badge" style="position:absolute; top:10px; left:10px; background:rgba(255,59,48,0.1); color:var(--neon-red); font-size:0.65rem; font-weight:700; padding:4px 8px; border-radius:6px; border: 1px solid rgba(255,59,48,0.3); z-index:5;">UNVERIFIED</span>' : ''}
            ${item.hotLabel ? '<span class="unverified-badge" style="position:absolute; top:10px; left:10px; background:rgba(174,36,72,0.14); color:#ffd7df; font-size:0.65rem; font-weight:700; padding:4px 8px; border-radius:6px; border: 1px solid rgba(174,36,72,0.35); z-index:5;">' + item.hotLabel + '</span>' : ''}
            <button class="heart-btn" onclick="toggleCardWatchlist(event, '${item.id}', this)" title="${isWatched ? 'Remove Watchlist' : 'Add Watchlist'}" style="color:${isWatched ? 'var(--accent-blue)' : 'rgba(255,255,255,0.4)'}">★</button>
        </div>
        <div class="row-body">
            <div>
                <div class="row-title">${item.title}</div>
                <div class="row-desc">${item.description || ''}</div>
            </div>
            <div>
                <div class="row-bid">₹${item.currentBid.toLocaleString('en-IN')}</div>
                <div class="row-meta">
                    <div>
                        <span style="font-size:0.75rem; color:var(--text-secondary); display:block; text-transform:uppercase; font-weight:700;">Closing In</span>
                        <span class="card-timer" id="timer-${item.id}" style="font-size:0.9rem; font-weight:600; color:var(--text-primary); margin:0;">Loading...</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="btn-primary" style="padding:10px 20px; font-size:0.85rem;" onclick="openDetail(event,'${item.id}')">See More Details</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    return div;
}

// ── Media cycling on masonry cards ────────────────────────────
window.shiftMedia = function(e, itemId, dir) {
    e.stopPropagation();
    const dotsContainer = e.target.parentElement;
    const card = e.target.closest('.masonry-card');
    if (!card) return;
    const items = card.querySelectorAll('[data-media-idx]');
    const dots = card.querySelectorAll('.media-dot');
    let current = [...items].findIndex(el => el.style.display !== 'none');
    let next = (current + dir + items.length) % items.length;
    items[current].style.display = 'none';
    items[next].style.display = 'block';
    if (items[next].tagName === 'VIDEO') items[next].play();
    else if (items[current].tagName === 'VIDEO') items[current].pause();
    dots.forEach((d, i) => { if (i === next) d.classList.add('active'); else d.classList.remove('active'); });
};

window.goToMedia = function(e, itemId, idx) {
    e.stopPropagation();
    const card = e.target.closest('.masonry-card');
    if (!card) return;
    const items = card.querySelectorAll('[data-media-idx]');
    const dots = card.querySelectorAll('.media-dot');
    items.forEach((el, i) => {
        el.style.display = i === idx ? 'block' : 'none';
        if (i !== idx && el.tagName === 'VIDEO') el.pause();
    });
    if (items[idx]?.tagName === 'VIDEO') items[idx].play();
    dots.forEach((d, i) => { if (i === idx) d.classList.add('active'); else d.classList.remove('active'); });
};

// ── Slide In Amazon Detail Panel ─────────────────────────────
window.openDetail = function(e, auctionId) {
    e.stopPropagation();
    openDetailById(auctionId);
};

window.openDetailById = async function(auctionId) {
    const overlay = document.getElementById('detail-overlay');
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    if (!overlay || !panel) return;

    overlay.style.display = 'block';
    panel.style.display = 'block';
    content.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-secondary);">Loading Market...</div>`;
    setTimeout(() => { panel.style.transform = 'translateX(0)'; }, 10);
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(`/api/auction/${auctionId}`);
        const item = await res.json();
        renderDetailPanel(item, content);
    } catch(err) {
        content.innerHTML = `<p style="padding:40px; color:var(--neon-red);">Failed to load item.</p>`;
    }
};

window.closeDetail = function(e) {
    if (e.target !== document.getElementById('detail-overlay') && e.target.id !== 'close-panel-btn') return;
    const panel = document.getElementById('detail-panel');
    panel.style.transform = 'translateX(100%)';
    setTimeout(() => {
        document.getElementById('detail-overlay').style.display = 'none';
        panel.style.display = 'none';
        document.body.style.overflow = '';
        if (window.detailWs) window.detailWs.close();
    }, 350);
};

function renderDetailPanel(item, container) {
    const media = buildMediaArray(item);
    window.currentDetailMedia = media;

    container.innerHTML = `
        <div style="background:var(--bg-card); display:flex; justify-content:space-between; align-items:center; padding:15px 25px; border-bottom:1px solid var(--border-color);">
            <h3 style="margin:0; font-size:1.1rem;">Market Detail</h3>
            <button id="close-panel-btn" onclick="closeDetail({target:this})" style="background:transparent; border:none; color:var(--text-primary); font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        
        <div style="flex:1; overflow-y:auto;">
            <div class="detail-images">
                ${media[0].type === 'image'
                    ? `<img id="detail-main-img" class="main-img" src="${media[0].src}" alt="${item.title}">`
                    : `<img id="detail-main-img" class="main-img" src="" alt="${item.title}" style="display:none;">`
                }
                <video id="detail-main-vid" class="main-video" controls style="display:${media[0].type === 'video' ? 'block' : 'none'};" ${media[0].type === 'video' ? `src="${media[0].src}"` : ''}></video>
            </div>

            ${media.length > 1 ? `
            <div class="detail-thumb-strip">
                ${media.map((m, i) => m.type === 'image'
                    ? `<img src="${m.src}" class="${i===0?'active':''}" onclick="switchDetailMedia(${i})"/>`
                    : `<div class="vid-thumb ${i===0?'active':''}" onclick="switchDetailMedia(${i})">▶</div>`
                ).join('')}
            </div>` : ''}

            <div style="padding:25px;">
                ${!item.verified ? `<span style="background:rgba(255,59,48,0.1); color:var(--neon-red); font-size:0.75rem; font-weight:700; padding:4px 8px; border-radius:6px; border:1px solid rgba(255,59,48,0.3); text-transform:uppercase; margin-bottom:15px; display:inline-block;">Unverified Asset</span>` : ''}
                <h2 style="margin:0 0 10px; font-size:1.5rem;">${item.title}</h2>
                <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:20px;">
                    ${item.bidCount || 0} Trades · Seller: <strong>${item.sellerName || item.sellerEmail}</strong>
                    ${item.category ? `· <span style="background:var(--glass-bg); padding:2px 8px; border-radius:4px;">${item.category}</span>` : ''}
                </p>

                <div style="display:flex; justify-content:space-between; align-items:flex-end; padding:20px; background:var(--glass-bg); border-radius:12px; border:1px solid var(--border-color); margin-bottom:25px;">
                    <div>
                        <div style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Current Market Price</div>
                        <div id="detail-price" style="font-size:2rem; font-weight:800; color:var(--neon-green);">₹${item.currentBid.toLocaleString('en-IN')}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Closing Time</div>
                        <div id="detail-timer-${item.id}" style="font-size:1.1rem; font-weight:700; color:var(--text-primary); font-variant-numeric:tabular-nums;">Loading...</div>
                    </div>
                </div>

                <div class="form-group" style="background:var(--bg-card); padding:25px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:25px;">
                    <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:10px;">PLACE A TRADE LIMIT</label>
                    <div style="display:flex; gap:10px;">
                        <input type="number" id="detail-bid-input" min="${item.currentBid + 1}" step="1" placeholder="₹${(item.currentBid + 1).toLocaleString('en-IN')} or more" class="form-control" style="flex:1;">
                        <button onclick="placeDetailBid('${item.id}')" class="btn-primary" style="padding:0 25px; white-space:nowrap;">Execute Trade</button>
                    </div>
                    <p id="detail-bid-msg" style="margin-top:10px; font-size:0.85rem; display:none;"></p>
                </div>

                <h4 style="font-size:1.1rem; margin-bottom:10px;">Asset Description</h4>
                <p style="color:var(--text-secondary); line-height:1.6; margin-bottom:30px;">${item.description || 'No description provided.'}</p>

                <a href="/item-detail.html?id=${item.id}" class="btn-primary" style="display:block; text-align:center; background:transparent; border:1px solid var(--border-color); color:var(--text-primary);">See More Details</a>
            </div>
        </div>
    `;

    // Start timer for panel
    if (item.endTime) {
        window.activeTimers.push({ el: `detail-timer-${item.id}`, end: new Date(item.endTime).getTime() });
    }

    // WebSocket for live price update in panel
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    window.detailWs = new WebSocket(`${protocol}://${location.host}/ws`);
    window.detailWs.onopen = () => window.detailWs.send(JSON.stringify({ type: 'watch', itemId: item.id }));
    window.detailWs.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'bid_update' && msg.itemId === item.id) {
            const priceEl = document.getElementById('detail-price');
            if (priceEl) {
                priceEl.style.transform = 'scale(1.1)';
                priceEl.style.textShadow = '0 0 10px var(--neon-green)';
                priceEl.textContent = `₹${msg.newBid.toLocaleString('en-IN')}`;
                setTimeout(() => { priceEl.style.transform = 'scale(1)'; priceEl.style.textShadow = 'none'; }, 500);
            }
        }
    };
}

// ── Detail switch media ────────────────────────────
window.switchDetailMedia = function(idx) {
    const media = window.currentDetailMedia || [];
    const img = document.getElementById('detail-main-img');
    const vid = document.getElementById('detail-main-vid');
    const thumbs = document.querySelectorAll('.detail-thumb-strip img, .detail-thumb-strip .vid-thumb');
    const selected = media[idx];
    if (!selected) return;

    thumbs.forEach((t, i) => { if (i === idx) t.classList.add('active'); else t.classList.remove('active'); });

    if (selected.type === 'image') {
        if (img) {
            img.style.display = 'block';
            img.src = selected.src;
        }
        if (vid) {
            vid.style.display = 'none';
            vid.pause();
        }
    } else {
        if (img) img.style.display = 'none';
        if (vid) {
            vid.style.display = 'block';
            vid.src = selected.src;
            vid.play().catch(() => {});
        }
    }
};

// ── Detail bid ────────────────────────────────────
window.placeDetailBid = async function(auctionId) {
    const input = document.getElementById('detail-bid-input');
    const msgEl = document.getElementById('detail-bid-msg');
    const amount = Number(input?.value);

    const currentItem = allAuctionsData.find((entry) => entry.id === auctionId);

    if (!amount || amount <= 0) {
        msgEl.textContent = 'Enter a valid amount limit.';
        msgEl.style.color = 'var(--neon-red)';
        msgEl.style.display = 'block';
        return;
    }
    if (!Number.isInteger(amount)) {
        msgEl.textContent = 'Trade amount must be in whole rupees only.';
        msgEl.style.color = 'var(--neon-red)';
        msgEl.style.display = 'block';
        return;
    }
    if (currentItem && amount <= Number(currentItem.currentBid || 0)) {
        msgEl.textContent = `Enter more than ₹${Number(currentItem.currentBid || 0).toLocaleString('en-IN')}.`;
        msgEl.style.color = 'var(--neon-red)';
        msgEl.style.display = 'block';
        return;
    }

    // Since auth.js creates the cookies, we can just hit the API endpoint
    try {
        const res = await fetch('/api/place-bid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: auctionId, bidAmount: amount })
        });
        
        if (res.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        const data = await res.json();
        if (!res.ok || data.success === false) {
            msgEl.textContent = data.message || 'Error placing trade.';
            msgEl.style.color = 'var(--neon-red)';
            msgEl.style.display = 'block';
        } else {
            input.value = '';
            msgEl.textContent = `Trade Limit of ₹${amount.toLocaleString('en-IN')} submitted successfully via Escrow.`;
            msgEl.style.color = 'var(--neon-green)';
            msgEl.style.display = 'block';
            setTimeout(() => msgEl.style.display = 'none', 5000);
        }
    } catch(e) {
        msgEl.textContent = 'Server error. Try again.';
        msgEl.style.color = 'var(--neon-red)';
        msgEl.style.display = 'block';
    }
};

let timerInterval;
function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const now = Date.now();
        window.activeTimers.forEach(t => {
            const el = document.getElementById(t.el);
            if (!el) return;
            const diff = t.end - now;
            if (diff <= 0) {
                el.textContent = "CLOSED";
                el.style.color = "var(--text-secondary)";
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                
                let timeStr = '';
                if (days > 0) timeStr += `${days}d `;
                timeStr += `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
                el.textContent = timeStr;
                
                // Turn red in last 10 minutes
                if (diff < 600 * 1000) {
                    el.style.color = "var(--neon-red)";
                    el.style.fontWeight = "bold";
                } else if (el.style.color === "var(--neon-red)") {
                    // Reset if it somehow was red but isn't now
                    el.style.color = "var(--text-primary)";
                    el.style.fontWeight = "500";
                }
            }
        });
    }, 1000);
}

function renderShortsFeed(auctions) {
    const homeContainer = document.getElementById('home-shorts-container');
    const auctionContainer = document.getElementById('auction-shorts-container');
    
    const featured = [...auctions]
        .filter(a => a.status === 'active')
        .sort((a,b) => b.bidCount - a.bidCount)
        .slice(0, 12);

    function buildCard(item) {
        const sellerName = (item.sellerEmail || 'seller').split('@')[0];
        const sellerInitial = sellerName.charAt(0).toUpperCase();
        const hasVideo = !!item.videoUrl;

        return `
        <div class="short-card" onclick="window.location.href='/short-view.html?id=${item.id}'">
            <div class="short-seller">
                <div class="short-seller-avatar">${sellerInitial}</div>
                <span class="short-seller-name">${sellerName}</span>
            </div>
            <div class="short-live-badge"><span class="short-live-dot"></span>LIVE</div>
            ${hasVideo
                ? `<video class="short-video" src="${item.videoUrl}" muted loop playsinline preload="metadata"></video>`
                : `<img class="short-media" src="${item.image}" alt="${item.title}" loading="lazy">`
            }
            <div class="short-overlay">
                <span class="short-timer live-timer" data-endtime="${item.endTime}" id="short-timer-${item.id}">Loading...</span>
                <p class="short-title">${item.title}</p>
                <p class="short-price">₹${item.currentBid.toLocaleString('en-IN')}</p>
            </div>
        </div>`;
    }

    // Home: only 6 cards (teaser)
    if (homeContainer) {
        const homeItems = featured.slice(0, 6);
        homeContainer.innerHTML = homeItems.map(buildCard).join('');
    }

    // Auction page: show all
    if (auctionContainer) {
        auctionContainer.innerHTML = featured.map(buildCard).join('');
    }

    // Add timers
    featured.forEach(item => {
        window.activeTimers.push({ el: `short-timer-${item.id}`, end: new Date(item.endTime).getTime() });
    });

    // IntersectionObserver for video autoplay
    setupVideoAutoplay();

    // Auth wall trigger (only on homepage for unauthenticated users)
    if (homeContainer) {
        setupAuthWallTrigger();
    }
}

function setupVideoAutoplay() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.6 });

    document.querySelectorAll('.short-video').forEach(v => observer.observe(v));
}

function setupAuthWallTrigger() {
    // Only for unauthenticated users
    fetch('/api/me').then(r => r.json()).then(data => {
        if (data.loggedIn) return;

        let wallShown = false;
        const sentinel = document.getElementById('auth-wall-sentinel');
        if (!sentinel) return;

        const wallObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !wallShown) {
                wallShown = true;
                showAuthWall();
            }
        }, { threshold: 0.1 });

        wallObserver.observe(sentinel);
    }).catch(() => {});
}

function showAuthWall() {
    const overlay = document.createElement('div');
    overlay.className = 'auth-wall-overlay';
    overlay.innerHTML = `
        <div class="auth-wall-panel">
            <h2>🔥 Sign up to binge auctions like Reels</h2>
            <p>Discover thousands of live auctions. Scroll, watch, and bid — all in one addictive feed.</p>
            <a href="/signup.html" class="btn-primary" style="display:block;">Continue with Email</a>
            <a href="/login.html" class="btn-primary" style="display:block; background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary);">Already have an account? Login</a>
        </div>
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            showLoginPill();
        }
    });

    document.body.appendChild(overlay);
}

function showLoginPill() {
    if (document.querySelector('.login-pill')) return;
    const pill = document.createElement('a');
    pill.className = 'login-pill';
    pill.href = '/login.html';
    pill.textContent = '🔒 Login to see more';
    document.body.appendChild(pill);
}

window.toggleCardWatchlist = async (e, id, btn) => {
    e.stopPropagation();
    btn.style.transform = 'scale(0.8)';
    setTimeout(() => btn.style.transform = 'scale(1)', 200);
    try {
        const res = await fetch('/api/watchlist/toggle', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id})
        });
        if (res.status === 401) {
            window.location.href = '/login.html';
            return;
        }
        const data = await res.json();
        if (data.success) {
            btn.style.color = data.added ? 'var(--accent-blue)' : 'rgba(255,255,255,0.4)';
            btn.title = data.added ? 'Remove from Watchlist' : 'Add to Watchlist';
            if (data.added && !userWatchlist.includes(id)) userWatchlist.push(id);
            if (!data.added) userWatchlist = userWatchlist.filter(wId => wId !== id);
            window.userWatchlist = userWatchlist;
        }
    } catch(err) {}
};
