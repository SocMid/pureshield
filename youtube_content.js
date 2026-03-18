// youtube_content.js – PureShield v1.0.5 (Isolated World – DOM Cleanup)
// Works alongside yt_scriptlet.js (Main World).
// Handles: element removal, skip-button clicking, shielding overlay, anti-adblock dismissal.

(function () {
  'use strict';

  let adsEnabled = true;

  // ── Elements to physically remove from the DOM ────────────────────
  const NUKE_SELECTORS = [
    // Homepage / feed ads
    'ytd-ad-slot-renderer',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer)',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-carousel-ad-renderer',
    'ytd-merch-shelf-renderer',
    'ytd-brand-video-singleton-renderer',
    'ytd-brand-video-shelf-renderer',
    '#masthead-ad',
    '#player-ads',
    // Search ads
    'ytd-search-pyv-renderer',
    'ytd-promoted-video-renderer',
    'ytd-promoted-sparkles-web-renderer',
    // Sidebar / companion ads
    'ytd-action-companion-ad-renderer',
    'ytd-companion-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-compact-promoted-item-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    'ytd-mealbar-promo-renderer',
    '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    // Player overlay ads
    '.ytp-ad-overlay-container',
    '.ytp-ad-module',
    '.ytp-ad-player-overlay-layout',
    '.ytp-ad-image-overlay',
    '.ytp-ad-text-overlay',
    '.ytp-ad-action-interstitial',
    // Anti-adblock popups
    'ytd-enforcement-message-view-model',
    'tp-yt-paper-dialog:has(yt-formatted-string#text.yt-about-this-ad-renderer)',
  ];

  // ── CSS to inject ────────────────────────────────────────────────
  function injectCSS() {
    const s = document.createElement('style');
    s.id = 'pureshield-v5-css';
    s.textContent = `
      /* Hide video element during ad playback */
      .ad-showing video,
      [class*="ad-interrupting"] video {
        opacity: 0 !important;
        pointer-events: none !important;
      }
      /* Hide player chrome during ad */
      .ad-showing .ytp-chrome-bottom,
      .ad-showing .ytp-chrome-top {
        opacity: 0 !important;
      }
      /* Visual shield overlay */
      #pureshield-shield {
        position: absolute; inset: 0;
        background: #000; z-index: 2147483647;
        display: none; place-items: center;
        color: #fff; font-family: 'Inter', sans-serif;
        pointer-events: none;
      }
      .ad-showing #pureshield-shield,
      [class*="ad-interrupting"] #pureshield-shield {
        display: grid !important;
      }
      #pureshield-shield .ps-logo {
        font-size: 26px; font-weight: 900;
        color: #2ecc71; letter-spacing: 3px;
        text-transform: uppercase;
      }
      #pureshield-shield .ps-sub {
        font-size: 12px; opacity: .6; margin-top: 8px;
        text-transform: uppercase; letter-spacing: 1px;
      }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  // ── Shield overlay ───────────────────────────────────────────────
  function mountShield() {
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (!player || player.querySelector('#pureshield-shield')) return;
    const d = document.createElement('div');
    d.id = 'pureshield-shield';
    d.innerHTML = '<div><div class="ps-logo">PureShield ⚡</div><div class="ps-sub">Ad neutralized</div></div>';
    player.appendChild(d);
  }

  // ── Core cleanup loop ────────────────────────────────────────────
  function cleanup() {
    if (!adsEnabled) return;

    // 1. Remove ad elements
    for (const sel of NUKE_SELECTORS) {
      const els = document.querySelectorAll(sel);
      if (els.length) {
        els.forEach(el => el.remove());
      }
    }

    // 2. Dismiss anti-adblock overlays
    const overlays = document.querySelectorAll('tp-yt-iron-overlay-backdrop');
    overlays.forEach(o => o.remove());
    // Click dismiss / continue buttons
    const dismiss = document.querySelector(
      '#dismiss-button, .yt-about-this-ad-renderer button, tp-yt-paper-dialog #dismiss-button'
    );
    if (dismiss) dismiss.click();

    // 3. Mount shield if needed
    mountShield();

    // 4. Skip / jump video ads
    const adActive = document.querySelector('.ad-showing, [class*="ad-interrupting"]');
    const video = document.querySelector('video');
    if (adActive && video) {
      // Click skip button instantly
      const skip = document.querySelector(
        '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button'
      );
      if (skip && skip.offsetParent !== null) {
        skip.click();
        return;
      }
      // Jump to end
      if (video.duration && isFinite(video.duration) && video.duration > 0.5) {
        video.currentTime = video.duration - 0.1;
      }
      video.playbackRate = 16;
      video.muted = true;
    }
  }

  // ── Init ──────────────────────────────────────────────────────────
  function init() {
    chrome.storage.local.get(['filters'], (result) => {
      adsEnabled = result.filters ? result.filters.ads !== false : true;
      if (!adsEnabled) return;

      injectCSS();

      // Run cleanup immediately and on interval
      cleanup();
      setInterval(cleanup, 150);

      // MutationObserver for instant reaction
      const obs = new MutationObserver(cleanup);
      obs.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.filters) {
      adsEnabled = changes.filters.newValue.ads !== false;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
