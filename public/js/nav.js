/**
 * Shared left sidebar navigation.
 * Replaces legacy top nav on static pages.
 */
(async function initSidebar() {
    document.body.classList.add('page-transition-ready');

    document.addEventListener('click', function(event) {
        const anchor = event.target.closest('a[href]');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
        if (anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;

        const nextUrl = new URL(href, window.location.origin);
        if (nextUrl.origin !== window.location.origin || nextUrl.href === window.location.href) return;

        event.preventDefault();
        document.body.classList.add('page-transition-leaving');
        window.setTimeout(function() {
            window.location.href = nextUrl.href;
        }, 140);
    });

    function clearBrowserAuthState() {
        try {
            [window.localStorage, window.sessionStorage].forEach((store) => {
                if (!store) return;
                const keys = [];
                for (let i = 0; i < store.length; i += 1) {
                    const key = store.key(i);
                    if (!key) continue;
                    if (key.indexOf('supabase') !== -1 || key.indexOf('sb-') !== -1) keys.push(key);
                }
                keys.forEach((key) => store.removeItem(key));
            });
        } catch (e) {}

        document.cookie = 'sb_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        document.cookie = 'jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }

    let user = null;
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.loggedIn) user = data.user;
    } catch (e) {}

    const header = document.querySelector('header');
    if (header) header.style.display = 'none';
    document.body.classList.add('has-app-sidebar');

    const isAdmin = user && (user.isAdmin || user.isSuperAdmin || user.role === 'admin');
    const isSuperAdmin = user && user.isSuperAdmin;
    const sidebar = document.createElement('aside');
    sidebar.className = 'app-sidebar';
    sidebar.innerHTML = `
        <a href="/" class="app-sidebar-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Gavel</span>
        </a>
        <nav class="app-sidebar-links">
            ${link('/', 'Home')}
            ${link('/auction.html', 'Auctions')}
            ${link('/explore.html', 'Explore')}
            ${link('/workspace/', 'Workspace')}
            ${user ? link('/workspace/watchlist.html', 'Watchlist') : ''}
            ${user ? link('/workspace/messages.html', 'Messages') : ''}
            ${link('/sell-product.html', 'Sell')}
            ${isAdmin ? link('/workspace/review.html', 'Review Queue') : ''}
            ${isSuperAdmin ? link('/workspace/governance.html', 'Super Admin') : ''}
            ${!user ? link('/login.html', 'Login') : ''}
        </nav>
        <div class="app-sidebar-footer">
            ${user ? `
                <div class="account-pocket">
                    <button type="button" class="account-pocket-trigger" id="account-pocket-trigger" aria-expanded="false" aria-controls="account-pocket-menu">
                        <span class="account-pocket-hole"></span>
                        <span class="account-pocket-avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</span>
                    </button>
                    <div class="account-pocket-menu" id="account-pocket-menu">
                        <div class="account-pocket-item">
                            <strong>${escapeHtml(user.name)}</strong>
                            <span>${isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : escapeHtml(user.role || 'member')}</span>
                        </div>
                        <a href="/profile.html#payment-methods" class="account-pocket-link">Payment Methods</a>
                        <button type="button" class="account-pocket-link danger" id="sidebar-logout">Logout</button>
                    </div>
                </div>
            ` : `<a href="/signup.html">Create account</a>`}
        </div>
    `;
    document.body.prepend(sidebar);

    if (user) {
        try {
            const res = await fetch('/api/my-chats');
            const chats = await res.json();
            const total = chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
            const messageLink = Array.from(sidebar.querySelectorAll('a')).find((anchor) => anchor.getAttribute('href') === '/workspace/messages.html');
            if (messageLink && total > 0) {
                messageLink.innerHTML += ` <span class="sidebar-badge">${total > 99 ? '99+' : total}</span>`;
            }
        } catch (e) {}
    }

    const logoutBtn = document.getElementById('sidebar-logout');
    const accountPocketTrigger = document.getElementById('account-pocket-trigger');
    const accountPocketMenu = document.getElementById('account-pocket-menu');
    if (accountPocketTrigger && accountPocketMenu) {
        accountPocketTrigger.addEventListener('click', function() {
            const isOpen = accountPocketMenu.classList.toggle('open');
            accountPocketTrigger.setAttribute('aria-expanded', String(isOpen));
        });
        document.addEventListener('click', function(event) {
            if (event.target === accountPocketTrigger || accountPocketTrigger.contains(event.target)) return;
            if (!accountPocketMenu.contains(event.target)) {
                accountPocketMenu.classList.remove('open');
                accountPocketTrigger.setAttribute('aria-expanded', 'false');
            }
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            await fetch('/api/logout', { method: 'POST' }).catch(() => null);
            clearBrowserAuthState();
            window.location.href = '/login.html';
        });
    }

    function link(href, label) {
        const active = window.location.pathname === href || (href !== '/' && window.location.pathname.startsWith(href.replace('index.html', '').replace('.html', '')));
        return `<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
