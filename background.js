// background.js – PureShield Service Worker (v1.1.0)

const AVG_REQUEST_SIZE_KB = 50; // KB per blocked request (estimate)
const AVG_REQUEST_TIME_MS = 80; // ms saved per blocked request (estimate)

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

  // Set up periodic stats counting using session rules
  await startStatsTracking();
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

// ── Stats Tracking via periodic matched-rules polling ────────────────────────
// onRuleMatchedDebug only works in dev mode.
// Instead, we poll getMatchedRules() every 10s across ALL tabs and accumulate.
let lastKnownRuleCount = 0;

async function startStatsTracking() {
  // Set up an alarm that fires every 30 seconds
  chrome.alarms.create('pureshield-stats', { periodInMinutes: 0.5 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'pureshield-stats') return;
  await updateStats();
});

async function updateStats() {
  try {
    // Get all matched rules across all tabs
    const tabs = await chrome.tabs.query({});
    let totalMatches = 0;

    for (const tab of tabs) {
      if (!tab.id || tab.id < 0) continue;
      try {
        const result = await chrome.declarativeNetRequest.getMatchedRules({ tabId: tab.id });
        totalMatches += (result.rulesMatchedInfo?.length ?? 0);
      } catch {
        // Tab may have been closed or is a system tab
      }
    }

    if (totalMatches > lastKnownRuleCount) {
      const newBlocked = totalMatches - lastKnownRuleCount;
      const saved = await chrome.storage.local.get(['stats']);
      const stats = saved.stats || { ...DEFAULT_STATE.stats };
      stats.totalBlocked += newBlocked;
      stats.bandwidthKB += newBlocked * AVG_REQUEST_SIZE_KB;
      stats.timeSavedMs += newBlocked * AVG_REQUEST_TIME_MS;
      await chrome.storage.local.set({ stats });
    }
    lastKnownRuleCount = totalMatches;
  } catch (e) {
    console.error('PureShield stats update error:', e);
  }
}

// Also track on tab navigation for more accurate counts
chrome.webNavigation?.onCompleted?.addListener(async (details) => {
  if (details.frameId !== 0) return;
  // Small delay to allow rules to match
  setTimeout(() => updateStats(), 2000);
});

// ── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE': {
      (async () => {
        // Force a stats update before responding
        await updateStats();
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
        } catch {
          sendResponse({ count: 0 });
        }
      })();
      return true;
    }

    case 'RESET_STATS': {
      (async () => {
        lastKnownRuleCount = 0;
        await chrome.storage.local.set({ stats: { ...DEFAULT_STATE.stats } });
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
