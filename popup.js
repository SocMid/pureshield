// popup.js – PureShield Popup Controller

const pageDomain   = document.getElementById('pageDomain');
const pageCount    = document.getElementById('pageCount');
const statTotal    = document.getElementById('statTotal');
const statBandwidth= document.getElementById('statBandwidth');
const statTime     = document.getElementById('statTime');
const protectPill  = document.getElementById('protectPill');
const protectText  = document.getElementById('protectText');
const resetBtn     = document.getElementById('resetBtn');

const toggleAds      = document.getElementById('toggleAds');
const toggleTrackers = document.getElementById('toggleTrackers');
const toggleHalal    = document.getElementById('toggleHalal');

// ── Formatters ────────────────────────────────────────────────
function fmtBW(kb) {
  if (kb < 1024) return Math.round(kb) + ' KB';
  if (kb < 1024*1024) return (kb/1024).toFixed(1) + ' MB';
  return (kb/(1024*1024)).toFixed(2) + ' GB';
}
function fmtTime(ms) {
  if (ms < 1000)   return Math.round(ms) + ' ms';
  if (ms < 60000)  return (ms/1000).toFixed(1) + ' s';
  if (ms < 3600000)return (ms/60000).toFixed(1) + ' min';
  return (ms/3600000).toFixed(1) + ' hr';
}
function fmtN(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toString();
}

function animateNum(el, target, fmt = String) {
  const from = parseInt(el.dataset.raw || '0') || 0;
  el.dataset.raw = target;
  const dur = 500, t0 = performance.now();
  function step(now) {
    const p = Math.min((now-t0)/dur, 1);
    const ease = 1 - Math.pow(1-p, 3);
    el.textContent = fmt(Math.round(from + (target-from)*ease));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Apply UI state based on filters ───────────────────────────
function applyUI(filters) {
  toggleAds.checked      = filters.ads      ?? true;
  toggleTrackers.checked = filters.trackers ?? true;
  toggleHalal.checked    = filters.halal    ?? false;

  if (filters.halal) {
    protectPill.classList.add('halal-active');
    protectText.textContent = '100% Protected';
  } else {
    protectPill.classList.remove('halal-active');
    const anyOn = filters.ads || filters.trackers;
    protectText.textContent = anyOn ? 'Protected' : 'Paused';
  }
}

// ── Load state ────────────────────────────────────────────────
async function loadState() {
  // Active tab domain
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      pageDomain.textContent = new URL(tab.url).hostname.replace(/^www\./,'');
    } catch { pageDomain.textContent = '—'; }
  }

  // Per-page block count
  let pageBlocked = 0;
  if (tab?.id) {
    try {
      const r = await chrome.declarativeNetRequest.getMatchedRules({ tabId: tab.id });
      pageBlocked = r.rulesMatchedInfo?.length ?? 0;
    } catch {}
  }
  animateNum(pageCount, pageBlocked);

  // Global state
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
    if (!res) return;
    applyUI(res.filters);
    animateNum(statTotal, res.stats.totalBlocked, fmtN);
    statBandwidth.textContent = fmtBW(res.stats.bandwidthKB || 0);
    statTime.textContent = fmtTime(res.stats.timeSavedMs || 0);
  });
}

// ── Filter toggles ─────────────────────────────────────────────
function onToggle(e) {
  const filter = e.target.dataset.filter;
  const enabled = e.target.checked;
  chrome.runtime.sendMessage({ type: 'TOGGLE_FILTER', filter, enabled }, (res) => {
    if (res?.filters) applyUI(res.filters);
  });
}

toggleAds.addEventListener('change', onToggle);
toggleTrackers.addEventListener('change', onToggle);
toggleHalal.addEventListener('change', onToggle);

// ── Reset stats ────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'RESET_STATS' }, () => {
    statTotal.textContent = '0';
    statTotal.dataset.raw = '0';
    statBandwidth.textContent = '0 KB';
    statTime.textContent = '0 ms';
    pageCount.textContent = '0';
    pageCount.dataset.raw = '0';
  });
});

// ── Bottom Nav ─────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.remove('hidden');
  });
});

// ── Init ───────────────────────────────────────────────────────
loadState();
