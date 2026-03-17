// halal_search.js – PureShield Halal Filter: Silent Search Result Filtering
// Runs at document_start — CSS injected immediately to prevent any flash
(function () {
  'use strict';

  // Only run if Halal Filter is enabled
  chrome.storage.local.get(['filters'], (data) => {
    if (data.filters && !data.filters.halal) return;
    init();
  });

  function init() {
    // ── Step 1: Inject CSS immediately to hide results the moment they're tagged ──
    const style = document.createElement('style');
    style.textContent = '[data-ps-blocked]{display:none!important;visibility:hidden!important;}';
    (document.head || document.documentElement).appendChild(style);

    // ── Blocked domain/keyword lists ─────────────────────────────────────────
    const BLOCKED_DOMAINS = [
      'pornhub','xvideos','xhamster','xnxx','redtube','youporn','tube8',
      'brazzers','bangbros','naughtyamerica','onlyfans','spankbang','beeg',
      'chaturbate','livejasmin','cam4','bongacams','stripchat','myfreecams',
      'tnaflix','drtuber','4tube','extremetube','xtube','slutload','sunporno',
      'keezmovies','megatube','sexvid','vporn','empflix','letmejerk','fux',
      'hardsextube','txxx','porntube','goldpornfilms','alotporn','xxxbunker',
      'bet365','betway','williamhill','bovada','1xbet','pokerstars',
      'bitstarz','stake.com','rollbit','roobet','casumo','unibet',
      'bwin','betfair','ladbrokes','skybet','betmgm','fanduel','draftkings',
      'partypoker','ggpoker','22bet','mostbet','melbet','parimatch',
      'casinoluck','leovegas','rizk','mrgreen','betsson',
    ];

    const BLOCKED_SEARCH_TERMS = [
      'porn','pornhub','xvideos','xhamster','xnxx','xxx video',
      'sex video','nude','naked girl','camgirl','onlyfans leak',
      'hentai video','adult video','erotic','casino bonus','free slots',
      'online betting','sports betting','online casino','gambling',
    ];

    // ── Platform selectors ───────────────────────────────────────────────────
    const host = location.hostname;

    let selectors = [];
    if (/google\./.test(host)) {
      selectors = ['#search .g', '#rso > div', '.MjjYud', '.tF2Cxc', '[data-hveid]'];
    } else if (/bing\.com/.test(host)) {
      selectors = ['#b_results > li.b_algo', '.b_algo'];
    } else if (/duckduckgo\.com/.test(host)) {
      selectors = ['[data-testid="result"]', '.result', '.result--web'];
    } else if (/youtube\.com/.test(host)) {
      selectors = ['ytd-search-renderer ytd-video-renderer', 'ytd-search-renderer ytd-channel-renderer'];
    }

    if (selectors.length === 0) return;

    // ── Check helpers ────────────────────────────────────────────────────────
    function isDomainBlocked(url) {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        return BLOCKED_DOMAINS.some(d => hostname.includes(d));
      } catch { return false; }
    }

    function isTermBlocked(text) {
      const lower = text.toLowerCase();
      return BLOCKED_SEARCH_TERMS.some(t => lower === t || lower.startsWith(t + ' ') || lower.includes(' ' + t));
    }

    function shouldBlock(el) {
      for (const a of el.querySelectorAll('a[href]')) {
        if (isDomainBlocked(a.href)) return true;
      }
      // Only check exact/near-exact heading matches to avoid false positives
      for (const h of el.querySelectorAll('h3, h4, [role="heading"]')) {
        if (isTermBlocked(h.textContent.trim())) return true;
      }
      // Check cite/URL display elements
      for (const cite of el.querySelectorAll('cite, [data-dtld]')) {
        if (BLOCKED_DOMAINS.some(d => cite.textContent.toLowerCase().includes(d))) return true;
      }
      return false;
    }

    // ── Filter results (silently) ────────────────────────────────────────────
    function filterResults() {
      for (const selector of selectors) {
        for (const el of document.querySelectorAll(selector)) {
          if (!el.dataset.psChecked) {
            el.dataset.psChecked = '1';
            if (shouldBlock(el)) {
              el.setAttribute('data-ps-blocked', '1');
            }
          }
        }
      }
    }

    // ── MutationObserver for dynamic/lazy results ────────────────────────────
    const observer = new MutationObserver(filterResults);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Run immediately and on DOMContentLoaded
    filterResults();
    document.addEventListener('DOMContentLoaded', filterResults);
  }

})();
