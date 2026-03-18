// youtube_content.js – PureShield HARD MODE YouTube Ad Blocker (v1.0.3)
// Strategy: "Visual Shielding" + "Maximum Aggression" Selectors + "50ms Bolt Skip"

(function () {
  'use strict';

  let adsEnabled = true;
  let originalPlaybackRate = 1;
  let originalMuted = false;
  let wasAdPlaying = false;

  // ── Maximum Aggression Selectors (2025 Comprehensive List) ─────────────────
  const AD_SELECTORS = [
    // --- HOME & SEARCH ADS ---
    'ytd-ad-slot-renderer',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-rich-item-renderer:has([class*="ad-"])',
    'ytd-carousel-ad-renderer',
    'ytd-merch-shelf-renderer',
    'ytd-search-pyv-renderer',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-statement-banner-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-compact-promoted-item-renderer',
    'ytd-brand-video-singleton-renderer',
    'ytd-brand-video-shelf-renderer',
    '#masthead-ad',
    '#player-ads',
    '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    
    // --- VIDEO PLAYER OVERLAY ADS ---
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-player-overlay-instream-info',
    '.ytp-ad-player-overlay',
    '.ytp-ad-action-interstitial',
    '.ytp-ad-module',
    '.ytp-ad-player-overlay-layout',
    '.ytp-ad-image-overlay-ad-info-button-container',
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-overlay-image',
    '.ytp-ad-simple-ad-badge',
    '.ytp-ad-visit-advertiser-button',
    '.ytp-ad-button-icon',

    // --- SIDEBAR & RECOMMENDED ADS ---
    'ytd-action-companion-ad-renderer',
    'ytd-companion-slot-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-mealbar-promo-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    
    // --- PLAYER UI ELEMENTS (BADGES/TEXT) ---
    '.ytp-ad-text',
    '.ytp-ad-badge',
    '.ytp-ad-preview-container',
    '.ytp-ad-skip-button-container',
    '.ytp-ad-persistent-progress-bar-container',
    '.ad-showing .ytp-progress-bar-container',
    
    // --- ANTI-ADBLOCK DIALOGS ---
    'ytd-enforcement-message-view-model',
    'tp-yt-paper-dialog.ytd-popup-container:has(#dismiss-button)',
    'tp-yt-iron-overlay-backdrop',
  ];

  let styleEl = null;
  let shieldEl = null;

  // ── Advanced Visual Shielding Overlay ───────────────────────────────
  function createShield() {
    if (shieldEl) return;
    shieldEl = document.createElement('div');
    shieldEl.id = 'pureshield-hard-overlay';
    shieldEl.innerHTML = `
      <div class="pureshield-container">
        <div class="pureshield-logo-wrap">
          <div class="pureshield-logo">PureShield</div>
          <div class="pureshield-bolt">⚡</div>
        </div>
        <div class="pureshield-status">HARD MODE: Neutralizing Ad Content...</div>
        <div class="pureshield-loader"></div>
      </div>
    `;
    
    const shieldStyle = document.createElement('style');
    shieldStyle.textContent = `
      #pureshield-hard-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, #0a0a0a 0%, #000 100%);
        z-index: 2147483647; /* MAX Z-INDEX */
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #fff;
        font-family: 'Inter', 'Roboto', sans-serif;
        pointer-events: none;
        transition: opacity 0.1s ease-in-out;
      }
      .ad-showing #pureshield-hard-overlay,
      [class*="ad-interrupting"] #pureshield-hard-overlay {
        display: flex !important;
        opacity: 1 !important;
      }
      .pureshield-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: pureshield-pulse 1.5s infinite ease-in-out;
      }
      .pureshield-logo-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }
      .pureshield-logo {
        font-size: 28px;
        font-weight: 900;
        color: #2ecc71;
        text-transform: uppercase;
        letter-spacing: 4px;
        text-shadow: 0 0 15px rgba(46, 204, 113, 0.5);
      }
      .pureshield-bolt {
        font-size: 24px;
        color: #f1c40f;
        animation: bolt-flicker 0.3s infinite;
      }
      .pureshield-status {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        opacity: 0.7;
        margin-bottom: 20px;
      }
      .pureshield-loader {
        width: 40px;
        height: 2px;
        background: rgba(255,255,255,0.1);
        position: relative;
        overflow: hidden;
      }
      .pureshield-loader::after {
        content: '';
        position: absolute;
        left: -100%;
        width: 100%;
        height: 100%;
        background: #2ecc71;
        animation: pureshield-load 0.8s infinite linear;
      }
      @keyframes pureshield-load {
        to { left: 100%; }
      }
      @keyframes pureshield-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      @keyframes bolt-flicker {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      /* AGGRESSIVE VIDEO HIDING */
      .ad-showing video,
      [class*="ad-interrupting"] video {
        opacity: 0 !important;
        visibility: hidden !important;
        filter: brightness(0) !important;
        pointer-events: none !important;
      }
      /* HIDE PLAYBACK CONTROLS DURING AD */
      .ad-showing .ytp-chrome-bottom,
      .ad-showing .ytp-chrome-top {
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(shieldStyle);
    
    const mountShield = () => {
      const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
      if (player && !player.contains(shieldEl)) {
        player.appendChild(shieldEl);
      }
    };
    mountShield();
    setInterval(mountShield, 1500);
  }

  function setAdHiderCSS(enable) {
    if (enable) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'pureshield-hard-css';
        styleEl.textContent = `
          ${AD_SELECTORS.join(',\n          ')} {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            overflow: hidden !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
      createShield();
    } else {
      if (styleEl) styleEl.remove();
      if (shieldEl) shieldEl.remove();
      styleEl = null;
      shieldEl = null;
    }
  }

  function isAdPlaying() {
    return !!(
      document.querySelector('.ad-showing') ||
      document.querySelector('.ytp-ad-player-overlay') ||
      document.querySelector('.ytp-ad-action-interstitial') ||
      document.querySelector('[class*="ad-interrupting"]')
    );
  }

  function tryClickSkip() {
    const skipSelectors = [
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      'button.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-overlay-close-button',
    ];
    for (const sel of skipSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  // --- HARD MODE SKIP ---
  function hardSkip() {
    if (!adsEnabled) return;
    const adActive = isAdPlaying();
    const video = document.querySelector('video');

    if (adActive && video) {
      if (!wasAdPlaying) {
        originalPlaybackRate = video.playbackRate === 16 ? 1 : video.playbackRate;
        originalMuted = video.muted;
        wasAdPlaying = true;
      }

      // Try skip button
      if (tryClickSkip()) return;

      // Force jump to end
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration - 0.1;
      }
      
      video.playbackRate = 16;
      video.muted = true;
      
      // Attempt to find and remove ad-related elements directly
      document.querySelectorAll('.ytp-ad-module, .ytp-ad-player-overlay-layout').forEach(el => el.remove());
      
    } else if (wasAdPlaying && !adActive) {
      wasAdPlaying = false;
      if (video) {
        video.playbackRate = originalPlaybackRate;
        video.muted = originalMuted;
      }
    }
  }

  // Monitor video.src for ad blobs
  function monitorSrc() {
    const video = document.querySelector('video');
    if (video && !video.dataset.monitored) {
      video.dataset.monitored = "true";
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'src') {
             if (isAdPlaying()) hardSkip();
          }
        });
      });
      observer.observe(video, { attributes: true });
    }
  }

  function init() {
    chrome.storage.local.get(['filters'], (saved) => {
      adsEnabled = saved.filters ? saved.filters.ads !== false : true;
      setAdHiderCSS(adsEnabled);
      if (adsEnabled) {
        // Bolt Polling: 50ms
        setInterval(() => {
          hardSkip();
          monitorSrc();
        }, 50);
      }
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.filters) {
      adsEnabled = changes.filters.newValue.ads !== false;
      setAdHiderCSS(adsEnabled);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
