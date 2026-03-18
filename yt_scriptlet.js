// yt_scriptlet.js - PureShield ULTRA MODE (Main World Injection)
// Replicates Brave/uBlock logic by stripping ad data from internal API responses.

(function() {
    'use strict';
    
    // List of properties to remove from YouTube's JSON responses
    const AD_PROPERTIES = [
        'adPlacements', 
        'playerAds', 
        'adSlots', 
        'adBreakParams', 
        'adEngagementId',
        'ads',
        'ad_break',
        'trackingParams'
    ];

    /**
     * Recursively remove ad-related properties from an object
     */
    function stripAds(obj) {
        if (!obj || typeof obj !== 'object') return;

        for (const prop of AD_PROPERTIES) {
            if (obj.hasOwnProperty(prop)) {
                delete obj[prop];
            }
        }

        // Deep traversal
        for (const key in obj) {
            if (typeof obj[key] === 'object') {
                stripAds(obj[key]);
            }
        }
    }

    // --- INTERCEPT JSON.PARSE ---
    const originalParse = JSON.parse;
    JSON.parse = function() {
        const obj = originalParse.apply(this, arguments);
        if (obj && (obj.adPlacements || obj.playerResponse || obj.sidebar)) {
            stripAds(obj);
        }
        return obj;
    };

    // --- INTERCEPT FETCH (Modern YouTube API) ---
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        const requestUrl = typeof url === 'string' ? url : (url instanceof Request ? url.url : '');
        
        return originalFetch.apply(this, arguments).then(async (response) => {
            if (requestUrl.includes('/youtubei/v1/player') || 
                requestUrl.includes('/youtubei/v1/next') ||
                requestUrl.includes('/youtubei/v1/browse')) {
                
                const clone = response.clone();
                try {
                    const data = await clone.json();
                    stripAds(data);
                    
                    // Create a new response with the stripped data
                    return new Response(JSON.stringify(data), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (e) {
                    return response;
                }
            }
            return response;
        });
    };

    // --- INTERCEPT XHR (Legacy YouTube API) ---
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        const self = this;
        const originalOnReadyStateChange = this.onreadystatechange;

        this.onreadystatechange = function() {
            if (self.readyState === 4 && self._url && 
               (self._url.includes('/youtubei/v1/player') || self._url.includes('/youtubei/v1/browse'))) {
                
                try {
                    const data = JSON.parse(self.responseText);
                    stripAds(data);
                    Object.defineProperty(self, 'responseText', { value: JSON.stringify(data) });
                    Object.defineProperty(self, 'response', { value: JSON.stringify(data) });
                } catch (e) {}
            }
            if (originalOnReadyStateChange) {
                return originalOnReadyStateChange.apply(this, arguments);
            }
        };
        return originalSend.apply(this, arguments);
    };

    console.log('[PureShield] ULTRA MODE Scriptlet Injected Successfully (v1.0.4)');
})();
