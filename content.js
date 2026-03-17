// content.js – PureShield Content Script
// Sends tab info to background for per-page blocked count tracking
(function () {
  if (window.top !== window) return; // only run in top frame

  // Request the blocked count for this tab from background
  chrome.runtime.sendMessage(
    { type: 'GET_PAGE_BLOCKED', tabId: null }, // tabId resolved in background via sender
    (_response) => {
      /* no-op, popup queries directly */
    }
  );
})();
