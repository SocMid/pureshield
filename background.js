// background.js – PureShield Service Worker

const AVG_REQUEST_SIZE_KB = 50; // KB per blocked request
const AVG_REQUEST_TIME_MS = 80; // ms saved per blocked request

// ── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  filters: { ads: true, trackers: true, halal: false },
  stats: { totalBlocked: 0, bandwidthKB: 0, timeSavedMs: 0 },
};

// ── Startup ─────────────────────────────────────────────────────────────────
chrome.runtime.onStartup.addListener(initExtension);
chrome.runtime.onInstalled.addListener(initExtension);

async function initExtension() {
  const saved = await chrome.storage.local.get(['filters', 'stats']);
  const filters = saved.filters || DEFAULT_STATE.filters;
  await applyRulesets(filters);
}

// ── Apply rulesets based on filter toggles ───────────────────────────────────
async function applyRulesets(filters) {
  const enableIds = [];
  const disableIds = [];
  for (const [id, enabled] of Object.entries(filters)) {
    if (enabled) {
      enableIds.push(id);
      // halal_extra is always linked to halal toggle
      if (id === 'halal') enableIds.push('halal_extra');
    } else {
      disableIds.push(id);
      if (id === 'halal') disableIds.push('halal_extra');
    }
  }
  // Deduplicate
  const enable = [...new Set(enableIds)];
  const disable = [...new Set(disableIds)].filter((id) => !enable.includes(id));
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enable,
      disableRulesetIds: disable,
    });
  } catch (e) {
    console.error('PureShield ruleset update error:', e);
  }
}

// ── Track blocked requests ───────────────────────────────────────────────────
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  // eslint-disable-next-line no-unused-vars
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
    const saved = await chrome.storage.local.get(['stats']);
    const stats = saved.stats || DEFAULT_STATE.stats;
    stats.totalBlocked += 1;
    stats.bandwidthKB += AVG_REQUEST_SIZE_KB;
    stats.timeSavedMs += AVG_REQUEST_TIME_MS;
    await chrome.storage.local.set({ stats });
  });
}

// ── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE': {
      (async () => {
        const saved = await chrome.storage.local.get(['filters', 'stats']);
        const filters = saved.filters || DEFAULT_STATE.filters;
        const stats = saved.stats || DEFAULT_STATE.stats;
        sendResponse({ filters, stats });
      })();
      return true;
    }

    case 'TOGGLE_FILTER': {
      (async () => {
        const saved = await chrome.storage.local.get(['filters']);
        const filters = saved.filters || DEFAULT_STATE.filters;
        filters[message.filter] = message.enabled;
        await chrome.storage.local.set({ filters });
        await applyRulesets(filters);
        sendResponse({ filters });
      })();
      return true;
    }

    case 'GET_PAGE_BLOCKED': {
      // Get matched rules for the current tab
      (async () => {
        try {
          const tabId = message.tabId;
          const result = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
          const count = result.rulesMatchedInfo ? result.rulesMatchedInfo.length : 0;
          sendResponse({ count });
        } catch (e) {
          // eslint-disable-next-line no-unused-vars
          sendResponse({ count: 0 });
        }
      })();
      return true;
    }

    case 'RESET_STATS': {
      (async () => {
        await chrome.storage.local.set({ stats: DEFAULT_STATE.stats });
        sendResponse({ success: true });
      })();
      return true;
    }

    case 'CLOSE_TAB': {
      if (sender.tab && sender.tab.id) {
        chrome.tabs.remove(sender.tab.id);
      }
      sendResponse({ success: true });
      return true;
    }
  }
});
