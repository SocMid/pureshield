// youtube_content.js – PureShield ULTRA MODE YouTube Ad Blocker (v1.0.4)
// Strategy: "Physical Removal" to fix grid gaps + Skip fallback

(function () {
  'use strict';

  let adsEnabled = true;
  let wasAdPlaying = false;

  // ── Ultra Removal Selectors (Elements to COMPLETELY .remove()) ────────────
  const REMOVAL_SELECTORS = [
    'ytd-ad-slot-renderer',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer)',
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
    'ytd-action-companion-ad-renderer',
    'ytd-companion-slot-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-mealbar-promo-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    'ytd-enforcement-message-view-model',
    'tp-yt-paper-dialog.ytd-popup-container:has(#dismiss-button)',
    'tp-yt-iron-overlay-backdrop',
    '.ytp-ad-module',
    '.ytp-ad-player-overlay-layout'
  ];

  let shieldEl = null;

  function createShield() {
    if (shieldEl) return;
    shieldEl = document.createElement('div');
    shieldEl.id = 'pureshield-ultra-overlay';
    shieldEl.innerHTML = `
      <div class="pureshield-container">
        <div class="pureshield-logo-wrap">
          <div class="pureshield-logo">PureShield</div>
          <div class="pureshield-bolt">⚡</div>
        </div>
        <div class="pureshield-status">ULTRA MODE: Scriptlet Active</div>
      </div>
    `;
    const shieldStyle = document.createElement('style');
    shieldStyle.textContent = `
      #pureshield-ultra-overlay {
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(circle, #0a0a0a 0%, #000 100%);
        z-index: 2147483647; display: none;
        flex-direction: column; justify-content: center; align-items: center;
        color: #fff; font-family: 'Inter', sans-serif; pointer-events: none;
      }
      .ad-showing #pureshield-ultra-overlay, [class*="ad-interrupting"] #pureshield-ultra-overlay {
        display: flex !important;
      }
      .pureshield-logo { font-size: 28px; font-weight: 900; color: #2ecc71; text-transform: uppercase; letter-spacing: 4px; }
      .pureshield-bolt { font-size: 24px; color: #f1c40f; }
      .pureshield-status { font-size: 13px; text-transform: uppercase; opacity: 0.7; margin-top: 10px; }
      .ad-showing video, [class*="ad-interrupting"] video { opacity: 0 !important; visibility: hidden !important; }
    `;
    document.head.appendChild(shieldStyle);
    
    const mount = () => {
      const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
      if (player && !player.contains(shieldEl)) player.appendChild(shieldEl);
    };
    mount();
    setInterval(mount, 2000);
  }

  function removeAds() {
    if (!adsEnabled) return;
    
    // 1. Physical Removal to fix grid layout
    REMOVAL_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        // If it's a rich-item-renderer, we should be careful to re-flow
        el.remove();
        // Trigger resize event to force YouTube to recalculate grid
        window.dispatchEvent(new Event('resize'));
      });
    });

    // 2. Video Skip Fallback
    const video = document.querySelector('video');
    const adActive = !!(document.querySelector('.ad-showing') || document.querySelector('[class*="ad-interrupting"]'));

    if (adActive && video) {
        wasAdPlaying = true;
        
        // Instant skip button click
        const skip = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern');
        if (skip) skip.click();

        // Speed up + Jump
        if (video.duration && isFinite(video.duration)) {
          video.currentTime = video.duration - 0.1;
        }
        video.playbackRate = 16;
        video.muted = true;
    } else if (wasAdPlaying && !adActive) {
        wasAdPlaying = false;
        if (video) {
            video.playbackRate = 1;
            video.muted = false;
        }
    }
  }

  function init() {
    chrome.storage.local.get(['filters'], (saved) => {
      adsEnabled = saved.filters ? saved.filters.ads !== false : true;
      if (adsEnabled) {
        createShield();
        // Polling for physical cleanup
        setInterval(removeAds, 100);
        // Instant removal for home grid
        const observer = new MutationObserver(removeAds);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
