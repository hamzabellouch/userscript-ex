# Userscript

A modern, lightweight, privacy-first browser extension that empowers users to easily install, create, edit, and manage custom Userscripts (`.user.js`) from any URL, local file, or the built-in code editor—running seamlessly across modern websites with full `GM_*` API compatibility.

<img width="2730" height="1536" alt="userscript" src="https://github.com/user-attachments/assets/2004b860-dcb7-4762-a38c-84e429a9f661" />

Compatible with all major browsers: **Chrome, Brave, Edge, Opera, Vivaldi (Chromium-based)** and **Mozilla Firefox**.



### <a name="Features"></a> ⭐ Features

- **Multiple Installation Methods:** Install scripts directly from any raw `.user.js` URL (such as GreasyFork, GitHub Raw, or OpenUserJS) with a live metadata preview, drag-and-drop or upload local `.user.js` / `.js` files, or start quickly from a pre-configured boilerplate template.
- **Built-In Dashboard & Code Editor:** Features a dedicated management dashboard (`editor.html`) with a line-numbered code editor, one-click directive insertion (`@match`, `@grant`, `@require`, `@run-at`, `@connect`), a live Metadata Inspector panel, real-time bracket and quote syntax validation (without `eval`), `Ctrl+S` / `Cmd+S` save shortcut, and `.user.js` export.
- **Quick-Access Popup & Context Menus:** Toggle the master engine globally, enable or disable individual scripts, inspect the active script count on the extension badge, install scripts from the popup, or right-click any page to open the dashboard or create a script pre-configured for the current domain.
- **Standard Userscript Metadata & Lifecycle Support:** Full parsing for `// ==UserScript==` headers (`@name`, `@namespace`, `@version`, `@description`, `@author`, `@homepage`, `@icon`, `@match`, `@include`, `@exclude`, `@grant`, `@require`, `@resource`, `@connect`, `@run-at`, `@downloadURL`, `@updateURL`, `@license`) with support for glob patterns, match patterns, regular expressions, and execution stages (`document-start`, `document-body`, `document-end`, `document-idle`).
- **Greasemonkey / Tampermonkey Compatible APIs:** Provides `GM_info`, `GM_addStyle`, `GM_setValue`, `GM_getValue`, `GM_deleteValue`, `GM_listValues`, `GM_xmlhttpRequest`, `GM_notification`, `GM_setClipboard`, `GM_openInTab`, modern Promise-based `GM.*` equivalents, and `unsafeWindow`.
- **Hybrid Execution Engine & CSP / Trusted Types Support:** Uses Chromium's native `chrome.userScripts` `USER_SCRIPT` world alongside a hybrid `content.js` DOM injection runner (with `TrustedTypes` policy support and `scripting.executeScript` `MAIN` world fallback), plus `declarativeNetRequest` response-header rules to ensure scripts execute reliably even on sites with strict Content Security Policies.
- **Single-Page Application (SPA) Navigation Support:** Automatically detects client-side route changes (`popstate`, `hashchange`, `yt-navigate-finish`, `yt-page-data-updated`, and URL polling) so userscripts run seamlessly on dynamic web apps like YouTube, X/Twitter, and GitHub without manual page reloads, while preventing duplicate execution.
- **Automatic `@require` Caching & Update Checks:** Fetches and caches external `@require` libraries locally on save/install, and supports manual or periodic update checks against `@updateURL`, `@downloadURL`, or the original source URL.
- **JSON Backup & Restore:** Export your entire userscript library, settings, and per-script storage to a portable `.json` backup file and restore it anytime.
- **Zero Telemetry & Zero Tracking:** Zero analytics SDKs, zero tracking beacons, zero advertisements, and 100% local `storage.local` persistence.



### <a name="RepositoryStructure"></a> 📁 Repository Structure

```text

├── chromium/          # Extension build directory for Chrome, Brave, Edge, Opera, Vivaldi
│   ├── icons/         # Extension logo & action icons (SVG and 16px to 512px PNGs)
│   ├── background.js  # Service worker managing userScripts registration, DNR CSP rules, GM_* APIs & updates
│   ├── content.js     # Hybrid page injection, Trusted Types policy, SPA observer & message bridge
│   ├── editor.css     # Stylesheet for the full-screen Dashboard & Code Editor
│   ├── editor.html    # Dashboard UI for managing scripts, code editing, installation & backup
│   ├── editor.js      # Dashboard controller, live metadata inspector, syntax validator & backup handler
│   ├── engine.js      # Shared metadata parser, URL pattern/regex matcher & default script template
│   ├── manifest.json  # Chromium Manifest V3 configuration (userScripts, scripting, DNR & storage)
│   ├── popup.css      # Stylesheet for the extension popup
│   ├── popup.html     # Quick-access popup UI for toggling scripts and fast URL/file installation
│   └── popup.js       # Popup controller and active tab badge/script management
│
├── firefox/           # Extension build directory for Mozilla Firefox
│   ├── icons/         # Extension logo & action icons (SVG and 16px to 512px PNGs)
│   ├── background.js  # Modular background script managing DNR CSP rules, GM_* APIs & updates
│   ├── content.js     # Hybrid page injection, Trusted Types policy, SPA observer & message bridge
│   ├── editor.css     # Stylesheet for the full-screen Dashboard & Code Editor
│   ├── editor.html    # Dashboard UI for managing scripts, code editing, installation & backup
│   ├── editor.js      # Dashboard controller, live metadata inspector, syntax validator & backup handler
│   ├── engine.js      # Shared metadata parser, URL pattern/regex matcher & default script template
│   ├── manifest.json  # Firefox Manifest V3 configuration (with Gecko ID)
│   ├── popup.css      # Stylesheet for the extension popup
│   ├── popup.html     # Quick-access popup UI for toggling scripts and fast URL/file installation
│   └── popup.js       # Popup controller and active tab badge/script management
│
├── LICENSE            # MIT License
├── PRIVACY_POLICY.md  # Comprehensive dual-language privacy policy and data governance
├── README.md          # Project documentation, feature overview, and installation guide
└── SECURITY.md        # Security policy, execution safety guidelines, and vulnerability reporting

```



### <a name="InstallationUsage"></a> ⚙️ Installation & Usage

### <a name="ForChromiumBasedBrowsers"></a> 🌐 For Chromium-Based Browsers (Chrome, Brave, Edge, Opera)

1. Open your Chromium-based browser and navigate to:
   - **Google Chrome / Brave / Opera:** `chrome://extensions/`
   - **Microsoft Edge:** `edge://extensions/`

2. Enable **Developer mode** (toggle located in the top-right corner).

3. Click **Load unpacked**.

4. Select the `chromium` directory:

```text
chromium/
├── icons/
├── background.js
├── content.js
├── editor.css
├── editor.html
├── editor.js
├── engine.js
├── manifest.json
├── popup.css
├── popup.html
└── popup.js
```

5. The extension will be loaded and ready immediately. Keep **Developer mode** (or the "Allow User Scripts" toggle on newer Chromium versions) enabled if you want Chromium's native `chrome.userScripts` API active alongside the built-in hybrid runner.

### <a name="ForMozillaFirefox"></a> 🦊 For Mozilla Firefox

1. Open **Mozilla Firefox** and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file inside the `firefox` directory:

```text
firefox/
└── manifest.json
```

4. The extension is now loaded and ready immediately.

> [!NOTE]
> For permanent installation in Firefox, the extension can be packaged and signed through [addons.mozilla.org](https://addons.mozilla.org) as an unlisted self-distributed add-on to generate a signed `.xpi` package.



### <a name="HowToUse"></a> 🖱️ How to Use

1. Click the **Userscript** icon in your browser toolbar to open the quick-access popup, or right-click any webpage and select **Userscript: Open Dashboard** (or **Userscript: Create Script for this site**).
2. Add a script using any of the three supported workflows:
   - **From URL:** Click **Add URL**, paste a raw `.user.js` link (e.g., from GreasyFork or GitHub Raw), inspect the parsed metadata, and click **Confirm & Install**.
   - **From File:** Click **File** (or drag and drop a `.user.js` / `.js` file into the Dashboard's **Add / Install** tab).
   - **From Scratch:** Click **+** / **New Script** to open the built-in Code Editor with a ready-to-use `// ==UserScript==` template.
3. Customize your script directives (`@match`, `@exclude`, `@grant`, `@require`, `@run-at`) while reviewing live metadata and syntax validation in the side inspector, then press `Ctrl+S` (or `Cmd+S`) to save.
4. Visit any matching website—the extension will automatically:
   - Match the current URL against your enabled scripts' `@match`, `@include`, and `@exclude` rules.
   - Display the count of active scripts on the toolbar badge.
   - Inject and execute the script at its configured `@run-at` stage, including across SPA page transitions.
5. Toggle individual scripts or pause the entire engine at any time from the popup or Dashboard.



### <a name="Privacy & Safety"></a> 🛡️ Privacy & Safety

- **100% Local Storage:** All installed userscripts, metadata, settings, and `GM_*` key-value data are stored strictly inside your browser's local storage (`storage.local`) and never uploaded to any developer server.
- **Zero Telemetry & Zero Ads:** Unlike bloated script managers or ad-supported tools, **Userscript** contains no analytics SDKs, no remote telemetry endpoints, and no advertisements.
- **Transparent Network Behavior:** Outbound requests are made only when you explicitly fetch/update a script from a URL, when a script declares `@require` dependencies, or when an installed script invokes `GM_xmlhttpRequest`.
- **Safe Syntax Inspection:** The built-in editor validates brackets, strings, template literals, and comments using a static parser without executing `eval` on untrusted code.



> [!WARNING]
> Userscripts run directly in the context of matched websites and may access DOM elements, page APIs, and granted `GM_*` capabilities (such as `GM_xmlhttpRequest`). Only install or run `.user.js` scripts from authors and sources you trust, and review a script's source code and `@match` / `@grant` directives before enabling it.



### <a name="Copyright©2026"></a> Copyright © 2026

Thank you for engaging with us. For inquiries or collaboration, please contact:  
hamzabellouchcontact@gmail.com

Stay connected and follow us on:  
[WhatsApp](https://whatsapp.com/channel/0029Vb7MArw0LKZMpjjqOk2P) | [Facebook](https://facebook.com/hamzabellouch1) | [Instagram](https://instagram.com/hamzabellouch0) | [Twitter](https://twitter.com/hamzabellouch0) | [Telegram](https://t.me/hammzabellouch) | [LinkedIn](https://www.linkedin.com/in/hamzabellouch)
