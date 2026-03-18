// youtube_content.js – PureShield YouTube Ad Blocker Script (v2)
// Inspired by uBlock Origin Lite's MV3 approach

(function () {
  'use strict';

  let adsEnabled = true;
  let originalPlaybackRate = 1;
  let originalMuted = false;
  let wasAdPlaying = false;

  // ── Expanded CSS selectors for YouTube ad elements ──────────────────────────
  const AD_SELECTORS = [
    // Video player overlay ads
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-player-overlay-instream-info',
    '.ytp-ad-player-overlay',
    '.ytp-ad-action-interstitial',
    '.ytp-ad-image-overlay-ad-info-button-container',
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-overlay-ad-info-button-container',
    // Player ad UI elements
    '.ytp-ad-button-icon',
    '.ytp-ad-visit-advertiser-button',
    '.ytp-ad-progress-list',
    '.ytp-ad-persistent-progress-bar-container',
    '.ytp-ad-survey-interstitial',
    '.ad-showing .ytp-progress-bar-container',
    // Page-level ads
    '#masthead-ad',
    '#player-ads',
    '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    // Feed / sidebar / banner ads
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    '.ytd-banner-promo-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-statement-banner-renderer',
    'ytd-action-companion-ad-renderer',
    '.ytd-action-companion-ad-renderer',
    'ytd-merch-shelf-renderer',
    'ytd-mealbar-promo-renderer',
    'ytd-compact-promoted-item-renderer',
    'ytd-compact-promoted-video-renderer',
    // Rich item ads (homepage & search)
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-search-pyv-renderer',
    'ytd-shelf-renderer[is-banner]',
    // Movie / promo offers
    'ytd-movie-offer-module-renderer',
    'ytd-brand-video-singleton-renderer',
    'ytd-brand-video-shelf-renderer',
    // Anti-adblock popup containers
    'tp-yt-paper-dialog.ytd-popup-container:has(#dismiss-button)',
    // Player ad text / badge
    '.ytp-ad-text',
    '.ytp-ad-badge',
    '.ytp-ad-preview-container',
    '.ytp-ad-skip-button-container',
    'div#player-overlay\\:8',
  ];

  let styleEl = null;

  // ── Inject CSS to hide ad elements ──────────────────────────────────────────
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
            max-height: 0 !important;
            overflow: hidden !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }
          /* Keep controls visible during ad for skip clicks */
          .ad-showing .ytp-chrome-bottom {
            display: block !important;
            opacity: 1 !important;
          }
          /* Hide the ad countdown timer */
          .ytp-ad-player-overlay-flyout-cta,
          .ytp-ad-player-overlay-layout__ad-info-container {
            display: none !important;
          }
        `;
        (document.head || document.documentElement).appendChild(styleEl);
      }
    } else {
      if (styleEl) {
        styleEl.remove();
        styleEl = null;
      }
    }
  }

  // ── Check if an ad is currently playing ─────────────────────────────────────
  function isAdPlaying() {
    return !!(
      document.querySelector('.ad-showing') ||
      document.querySelector('.ytp-ad-player-overlay') ||
      document.querySelector('.ytp-ad-player-overlay-instream-info') ||
      document.querySelector('div[class*="ad-interrupting"]') ||
      document.querySelector('.ytp-ad-action-interstitial')
    );
  }

  // ── Click skip button (multiple selector variants) ──────────────────────────
  function tryClickSkip() {
    const skipSelectors = [
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      'button.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-skip-button-container button',
      'button[class*="ytp-ad-skip"]',
      '.videoAdUiSkipButton',
      '[id^="skip-button"]',
      '.ytp-ad-overlay-close-button',
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

  // ── Dismiss anti-adblock popups ─────────────────────────────────────────────
  function dismissAntiAdblock() {
    // YouTube enforcement/warning dialogs
    const enforcementSelectors = [
      'ytd-enforcement-message-view-model',
      'tp-yt-paper-dialog:has(yt-upsell-dialog-renderer)',
      'tp-yt-paper-dialog.ytd-popup-container',
      'ytd-popup-container tp-yt-paper-dialog',
    ];

    for (const sel of enforcementSelectors) {
      const dialog = document.querySelector(sel);
      if (dialog && dialog.offsetParent !== null) {
        // Try clicking dismiss/continue buttons
        const dismissBtns = dialog.querySelectorAll(
          '#dismiss-button, .dismiss-button, button[aria-label="Close"], ' +
          'yt-button-renderer, tp-yt-paper-button, button'
        );
        for (const btn of dismissBtns) {
          const text = btn.textContent?.toLowerCase() || '';
          if (
            text.includes('dismiss') ||
            text.includes('continue') ||
            text.includes('no thanks') ||
            text.includes('skip') ||
            text.includes('close') ||
            text.includes('got it')
          ) {
            btn.click();
            return;
          }
        }
        // Fallback: remove the dialog entirely
        dialog.remove();
      }
    }

    // Also remove the overlay backdrop if present
    const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
    if (backdrop && backdrop.style.display !== 'none') {
      backdrop.style.display = 'none';
    }
  }

  // ── Main ad handler – called frequently ─────────────────────────────────────
  function handleAds() {
    if (!adsEnabled) return;

    const adActive = isAdPlaying();
    const video = document.querySelector('video');

    if (adActive && video) {
      // Save original state when ad first appears
      if (!wasAdPlaying) {
        originalPlaybackRate = video.playbackRate === 16 ? 1 : video.playbackRate;
        originalMuted = video.muted;
        wasAdPlaying = true;
      }

      // 1. Try clicking skip button first
      if (tryClickSkip()) return;

      // 2. For unskippable ads: jump to end
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }

      // 3. Fallback: speed up and mute
      if (video.playbackRate !== 16) video.playbackRate = 16;
      if (!video.muted) video.muted = true;
    } else if (wasAdPlaying && !adActive) {
      // Ad just ended — restore original state
      wasAdPlaying = false;
      if (video) {
        if (video.playbackRate === 16) video.playbackRate = originalPlaybackRate;
        if (video.muted && !originalMuted) video.muted = false;
      }
    }

    // Always try to dismiss anti-adblock popups
    dismissAntiAdblock();
  }

  // ── Remove promoted content from search / feed ──────────────────────────────
  function removePromotedContent() {
    if (!adsEnabled) return;

    const promotedSelectors = [
      'ytd-search-pyv-renderer',
      'ytd-shelf-renderer[is-banner]',
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-compact-promoted-item-renderer',
      'ytd-compact-promoted-video-renderer',
      'ytd-brand-video-singleton-renderer',
    ];

    for (const sel of promotedSelectors) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // Also remove rich items that contain ads
    document.querySelectorAll('ytd-rich-item-renderer').forEach((el) => {
      if (el.querySelector('ytd-ad-slot-renderer')) {
        el.remove();
      }
    });
  }

  // ── MutationObserver with debouncing ────────────────────────────────────────
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      handleAds();
      removePromotedContent();
    }, 16); // ~1 frame debounce
  });

  // ── Initialization ──────────────────────────────────────────────────────────
  function init() {
    chrome.storage.local.get(['filters'], (saved) => {
      adsEnabled = saved.filters ? saved.filters.ads !== false : true;

      setAdHiderCSS(adsEnabled);

      if (!adsEnabled) return;

      // Observe DOM changes (childList + attributes for class changes)
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'src'],
      });

      // Fast polling at 100ms for ad detection
      setInterval(handleAds, 100);

      // Slower polling for promoted content cleanup
      setInterval(removePromotedContent, 1000);
    });
  }

  // ── Listen for filter toggle changes ────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.filters) {
      const newAdsEnabled = changes.filters.newValue.ads !== false;

      if (newAdsEnabled !== adsEnabled) {
        adsEnabled = newAdsEnabled;
        setAdHiderCSS(adsEnabled);

        if (adsEnabled) {
          // Re-init observer & polling
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'src'],
          });
        } else {
          observer.disconnect();
        }
      }
    }
  });

  // ── Handle YouTube SPA navigation ───────────────────────────────────────────
  // YouTube uses SPA navigation (no full page reload), so we need to
  // re-check when navigation events fire
  document.addEventListener('yt-navigate-finish', () => {
    if (adsEnabled) {
      handleAds();
      removePromotedContent();
    }
  });

  // ── Start ───────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
