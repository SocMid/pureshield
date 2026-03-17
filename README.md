<div align="center">
  <img src="icons/icon128.png" alt="PureShield Logo" width="128">
  <h1>PureShield</h1>
  <p><strong>A comprehensive, privacy-first ad blocker, tracker blocker, and halal internet filter by SOCMID.</strong></p>

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/SocMid/pureshield)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/SocMid/pureshield/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/platform-Chrome%20|%20Edge%20|%20Brave-lightgrey.svg)](#)

</div>

<br>

## 🛡️ Features

PureShield is built on Manifest V3 for optimal performance and security. It offers a three-pillar protection system:

- **🛑 Ad Blocking (Default: ON):** Eliminates intrusive banners, pop-ups, and video ads, speeding up page load times and saving bandwidth.
- **🕵️ Tracker Blocking (Default: ON):** Prevents third-party scripts and analytics platforms from following your online activity, keeping your data private.
- **🌙 Halal Filter (Optional):** A dedicated mode that filters out inappropriate, NSFW (Not Safe For Work), and haram content based on Islamic values.
  - _Safe Search Enforcement:_ Automatically activates strict safe search on Google, Bing, and DuckDuckGo.
  - _Domain Blocking:_ Blocks access to known inappropriate websites.
  - _YouTube Filtering:_ Hides shorts and potentially distracting content on YouTube to maintain focus.

## 🚀 Installation (Developer Mode)

Since this extension is currently in development/beta, you can install it directly from the source code.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SocMid/pureshield.git
    cd pureshield
    ```
2.  **Open Chrome/Edge/Brave Extensions Page:**
    - Chrome: Go to `chrome://extensions/`
    - Edge: Go to `edge://extensions/`
    - Brave: Go to `brave://extensions/`
3.  **Enable Developer Mode:** Toggle the "Developer mode" switch in the top right corner.
4.  **Load Unpacked:** Click the "Load unpacked" button in the top left corner.
5.  **Select Directory:** Select the `pureshield` folder you just cloned.
6.  _Done!_ The PureShield icon should now appear in your browser's toolbar.

## ⚙️ How It Works (Technical Overview)

PureShield utilizes the modern `declarativeNetRequest` API mandated by Chrome Manifest V3, ensuring rules are evaluated efficiently by the browser engine itself, rather than relying on background scripts, which significantly improves performance and battery life.

- **Manifest V3:** Fully compliant with the latest extension standards.
- **Rule Engine:** Uses static JSON rulesets (`rules/ads.json`, `rules/trackers.json`, `rules/halal.json`) that are dynamically enabled/disabled via the popup interface.
- **Service Worker:** A lightweight background script (`background.js`) manages state changes and badge updates without constantly running in the background.
- **Content Scripts:** Injected scripts (`content.js`, `halal_search.js`, `youtube_content.js`) handle complex DOM manipulations that declarative rules cannot achieve (e.g., hiding specific elements on YouTube or enforcing URL parameters for safe search).

## 🛠️ File Structure

```text
pureshield/
├── manifest.json          # Extension configuration & permissions
├── background.js          # Service worker for state management
├── popup.html             # The UI panel shown when clicking the icon
├── popup.css              # Styling for the UI panel
├── popup.js               # Logic for toggling features in the UI
├── content.js             # General content script for DOM manipulation
├── halal_search.js        # Enforces safe search on search engines
├── youtube_content.js     # Custom filters for YouTube (e.g., hiding shorts)
├── blocked.html           # Custom "Site Blocked" page
├── blocked.js             # Logic for the blocked page
├── rules/                 # declarativeNetRequest JSON rule files
│   ├── ads.json
│   ├── trackers.json
│   ├── halal.json
│   └── halal_extra.json
└── icons/                 # Extension icons
```

## 🤝 Contributing

Contributions are welcome! Whether it's adding new block rules, improving the UI, or optimizing performance.

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/amazing-feature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some amazing feature'`).
5.  Push to the branch (`git push origin feature/amazing-feature`).
6.  Open a Pull Request.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

---

\*Developed with 💚 by **SOCMID\***
