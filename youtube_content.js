// youtube_content.js – PureShield Advanced YouTube Ad Blocker (v1.0.2)
// Strategy: "Visual Shielding" to eliminate flicker + Fast skipping

(function () {
  'use strict';

  let adsEnabled = true;
  let originalPlaybackRate = 1;
  let originalMuted = false;
  let wasAdPlaying = false;

  // ── CSS selectors for YouTube ad elements ──────────────────────────
  const AD_SELECTORS = [
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-player-overlay-instream-info',
    '.ytp-ad-player-overlay',
    '.ytp-ad-action-interstitial',
    '.ytp-ad-button-icon',
    '.ytp-ad-visit-advertiser-button',
    '.ytp-ad-progress-list',
    '.ad-showing .ytp-progress-bar-container',
    '#masthead-ad',
    '#player-ads',
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-statement-banner-renderer',
    'ytd-action-companion-ad-renderer',
    '.ytp-ad-text',
    '.ytp-ad-badge',
    '.ytp-ad-preview-container',
    '.ytp-ad-skip-button-container',
  ];

  let styleEl = null;
  let shieldEl = null;

  // ── Create and Inject the Shielding Overlay ─────────────────────────
  function createShield() {
    if (shieldEl) return;
    shieldEl = document.createElement('div');
    shieldEl.id = 'pureshield-video-overlay';
    shieldEl.innerHTML = `
      <div class="pureshield-content">
        <div class="pureshield-logo">PureShield</div>
        <div class="pureshield-status">Protecting your experience...</div>
      </div>
    `;
    // Styles for the shield
    const shieldStyle = document.createElement('style');
    shieldStyle.textContent = `
      #pureshield-video-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        z-index: 1000;
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #fff;
        font-family: 'Roboto', sans-serif;
        pointer-events: none;
        transition: opacity 0.1s ease-out;
      }
      .ad-showing #pureshield-video-overlay {
        display: flex !important;
        opacity: 1 !important;
      }
      .pureshield-content {
        text-align: center;
      }
      .pureshield-logo {
        font-size: 24px;
        font-weight: bold;
        color: #2ecc71;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .pureshield-status {
        font-size: 14px;
        opacity: 0.8;
      }
      /* COMPLETELY HIDE the video while ad is showing to prevent flicker */
      .ad-showing video {
        display: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(shieldStyle);
    
    // Attempt to mount shield into player
    const mountShield = () => {
      const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
      if (player && !player.contains(shieldEl)) {
        player.appendChild(shieldEl);
      }
    };
    mountShield();
    setInterval(mountShield, 2000); // Ensure it stays there
  }

  function setAdHiderCSS(enable) {
    if (enable) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'pureshield-yt-css';
        styleEl.textContent = `
          ${AD_SELECTORS.join(',\n          ')} {
            display: none !important;
            visibility: hidden !important;
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
      document.querySelector('.ytp-ad-action-interstitial')
    );
  }

  function tryClickSkip() {
    const skipSelectors = [
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      'button.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-slot button',
    ];
    for (const sel of skipSelectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function handleAds() {
    if (!adsEnabled) return;
    const adActive = isAdPlaying();
    const video = document.querySelector('video');

    if (adActive && video) {
      if (!wasAdPlaying) {
        originalPlaybackRate = video.playbackRate === 16 ? 1 : video.playbackRate;
        originalMuted = video.muted;
        wasAdPlaying = true;
      }

      if (tryClickSkip()) return;

      // Unskippable handling: Speed up + Jump to end
      if (video.duration && isFinite(video.duration)) {
          video.currentTime = video.duration;
      }
      
      video.playbackRate = 16;
      video.muted = true;
      
    } else if (wasAdPlaying && !adActive) {
      wasAdPlaying = false;
      if (video) {
        video.playbackRate = originalPlaybackRate;
        video.muted = originalMuted;
      }
    }
  }

  function init() {
    chrome.storage.local.get(['filters'], (saved) => {
      adsEnabled = saved.filters ? saved.filters.ads !== false : true;
      setAdHiderCSS(adsEnabled);
      if (adsEnabled) {
        setInterval(handleAds, 100);
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
