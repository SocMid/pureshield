// youtube_content.js – PureShield YouTube Ad Blocker Script

(function () {
  'use strict';

  let adsEnabled = true;

  // ── CSS selectors for YouTube ad elements to hide
  const AD_SELECTORS = [
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-player-overlay-instream-info',
    '#masthead-ad',
    '.ytd-banner-promo-renderer',
    'ytd-banner-promo-renderer',
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-statement-banner-renderer',
    '.ytd-action-companion-ad-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-merch-shelf-renderer',
    '.ytp-ad-button-icon',
    '.ytp-ad-visit-advertiser-button',
    '.ytp-ad-progress-list',
    '.ad-showing .ytp-progress-bar-container',
    'ytd-mealbar-promo-renderer',
    'tp-yt-paper-dialog.ytd-popup-container',
    '#player-ads',
    '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
  ];

  let styleEl = null;

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
          .ad-showing .ytp-chrome-bottom {
            display: block !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    } else {
      if (styleEl) {
        styleEl.remove();
        styleEl = null;
      }
    }
  }

  function skipAd() {
    if (!adsEnabled) return;

    const skipBtn =
      document.querySelector('.ytp-skip-ad-button') ||
      document.querySelector('.ytp-ad-skip-button') ||
      document.querySelector('button.ytp-ad-skip-button-modern');

    if (skipBtn) {
      skipBtn.click();
      return;
    }

    const video = document.querySelector('video');
    if (!video) return;

    const adShowing =
      document.querySelector('.ad-showing') || document.querySelector('.ytp-ad-player-overlay');

    if (adShowing) {
      if (!video.muted) video.muted = true;
      if (video.playbackRate !== 16) video.playbackRate = 16;
    } else {
      if (video.playbackRate === 16) video.playbackRate = 1;
    }
  }

  function removePromotedSearchResults() {
    if (!adsEnabled) return;
    document
      .querySelectorAll('ytd-search-pyv-renderer, ytd-shelf-renderer[is-banner]')
      .forEach((el) => el.remove());
  }

  const observer = new MutationObserver(() => {
    skipAd();
    removePromotedSearchResults();
  });

  function init() {
    chrome.storage.local.get(['filters'], (saved) => {
      adsEnabled = saved.filters ? saved.filters.ads !== false : true;

      setAdHiderCSS(adsEnabled);

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      setInterval(() => {
        skipAd();
      }, 500);
    });
  }

  // Listen for background toggles
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
