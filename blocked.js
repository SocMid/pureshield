// blocked.js - Logic for the blocked page

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('closeBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Background handles CLOSE_TAB by removing the sender tab
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'CLOSE_TAB' }, () => {
          window.close(); // Fallback
        });
      } else {
        window.close();
      }
    });
  }
});
