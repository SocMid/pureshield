// yt_scriptlet.js - PureShield v1.0.5 (Main World – Brave-Level Interception)
// Injected with world:"MAIN" at document_start BEFORE YouTube's own scripts.
// Strips ALL ad-related data from YouTube's internal API responses.

(function () {
  'use strict';

  // Keys that carry ad payloads in YouTube's JSON responses
  const AD_KEYS = new Set([
    'adPlacements',
    'playerAds',
    'adSlots',
    'adBreakParams',
    'adBreakHeartbeatParams',
    'adBreakRenderer',
    'adInlinePlaybackStaticText',
    'advertisedVideo',
    'promotedSparklesWebRenderer',
    'promotedSparklesText',
    'promotedVideoRenderer',
    'engagementPanelSectionListRenderer',
    'sparklesMediaResponse',
    'searchPyvRenderer',
    'compactPromotedItemRenderer',
    'actionCompanionAdRenderer',
    'adInfoRenderer',
    'adHoverTextButtonRenderer',
    'displayAdRenderer'
  ]);

  /**
   * Walk any value and delete ad-related keys in-place.
   * Uses an iterative stack to avoid deep-recursion performance hits.
   */
  function nuke(root) {
    if (!root || typeof root !== 'object') return root;
    const stack = [root];
    const seen = new WeakSet();
    while (stack.length) {
      const obj = stack.pop();
      if (seen.has(obj)) continue;
      seen.add(obj);
      if (Array.isArray(obj)) {
        for (let i = obj.length - 1; i >= 0; i--) {
          const v = obj[i];
          if (v && typeof v === 'object') {
            // Remove array items that are ad renderers
            if (v.adSlotRenderer || v.promotedSparklesWebRenderer || v.searchPyvRenderer ||
                v.promotedVideoRenderer || v.compactPromotedItemRenderer || v.actionCompanionAdRenderer ||
                v.displayAdRenderer) {
              obj.splice(i, 1);
            } else {
              stack.push(v);
            }
          }
        }
      } else {
        for (const key of Object.keys(obj)) {
          if (AD_KEYS.has(key)) {
            delete obj[key];
          } else if (obj[key] && typeof obj[key] === 'object') {
            stack.push(obj[key]);
          }
        }
      }
    }
    return root;
  }

  // ── 1. JSON.parse Override ─────────────────────────────────────────
  const _parse = JSON.parse;
  JSON.parse = function (text) {
    const result = _parse.apply(this, arguments);
    // YouTube passes almost everything through JSON.parse
    // so we nuke every parsed object that looks like a YT response
    if (result && typeof result === 'object') {
      nuke(result);
    }
    return result;
  };
  // Preserve toString so YouTube doesn't detect the override
  JSON.parse.toString = _parse.toString.bind(_parse);

  // ── 2. Response.prototype.json Override ────────────────────────────
  const _json = Response.prototype.json;
  Response.prototype.json = async function () {
    const data = await _json.call(this);
    if (data && typeof data === 'object') {
      nuke(data);
    }
    return data;
  };

  // ── 3. Fetch Override (Block ad-specific requests entirely) ────────
  const _fetch = window.fetch;
  window.fetch = function (input) {
    const url = (typeof input === 'string') ? input : (input && input.url) || '';
    // Block requests that are purely ad-related
    if (url.includes('/api/stats/ads') ||
        url.includes('/api/stats/atr') ||
        url.includes('/ptracking') ||
        url.includes('/pagead/') ||
        url.includes('/get_midroll_') ||
        url.includes('doubleclick.net') ||
        url.includes('googlesyndication.com') ||
        url.includes('/log_event?alt=json&key=') ) {
      return Promise.resolve(new Response('{}', { status: 200 }));
    }
    return _fetch.apply(this, arguments);
  };
  window.fetch.toString = _fetch.toString.bind(_fetch);

  // ── 4. XMLHttpRequest Override (Block ad requests) ─────────────────
  const _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    const u = String(url);
    if (u.includes('/api/stats/ads') ||
        u.includes('/api/stats/atr') ||
        u.includes('/ptracking') ||
        u.includes('/pagead/') ||
        u.includes('/get_midroll_') ||
        u.includes('doubleclick.net') ||
        u.includes('googlesyndication.com')) {
      // Redirect to a no-op
      this._blocked = true;
      return _xhrOpen.call(this, method, 'data:text/plain,');
    }
    this._blocked = false;
    return _xhrOpen.apply(this, arguments);
  };

  // ── 5. Object.defineProperty guard ─────────────────────────────────
  // YouTube sometimes sets ad config via property assignment
  try {
    const _dp = Object.defineProperty;
    Object.defineProperty = function (target, prop, desc) {
      if (AD_KEYS.has(prop) && desc && 'value' in desc) {
        return target; // silently drop
      }
      return _dp.apply(this, arguments);
    };
  } catch (e) { /* on failure, silently continue */ }

  console.log('[PureShield] v1.0.5 Main-World scriptlet active.');
})();
