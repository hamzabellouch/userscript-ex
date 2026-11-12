# Security Policy

## Supported Versions

The following versions of **Userscript** are currently supported with security and stability updates.

| Version | Supported |
| -------- | --------- |
| 1.0.x (latest release) | ✅ |
| < 1.0.0 | ❌ |

---

## Reporting a Vulnerability

If you discover a security vulnerability, privacy leak, or behavior that could negatively impact users or the host browser environment, please report it responsibly.

### Before Reporting

Please ensure that:

- The issue is reproducible.
- You are using the latest supported release of **Userscript** (v1.0.0+).
- The issue is not caused by modified builds, unsupported browser forks, conflicting third-party extensions, or malicious third-party `.user.js` scripts installed manually by the user.

### How to Report

You can report vulnerabilities through:

- **GitHub Issues:** [hamzabellouch/userscript-ex/issues](https://github.com/hamzabellouch/userscript-ex/issues) (for general non-sensitive bugs or security queries)
- **Email Contact:** `hamzabellouchcontact@gmail.com` (for sensitive vulnerabilities, security disclosures, or exploit details)

When submitting a report, please include:

- Browser name and version (e.g., Chrome 130+, Firefox 132+, Edge 130+)
- Operating system and version (e.g., Windows 11, macOS Sequoia, Ubuntu 24.04)
- **Userscript** version (e.g., v1.0.0)
- Steps to reproduce the vulnerability
- Target webpage URL or sample userscript where the issue occurred (if applicable)
- Console error logs or debug screenshots (if available)
- A clear assessment of the potential security or privacy impact

### Response Policy

Security reports are reviewed as quickly as possible.

If a report is confirmed:

- The vulnerability will be investigated and patched promptly.
- A fix will be included in the next update release.
- Credit will be given to the reporter upon request.

If a report cannot be reproduced, lacks actionable information, or is determined not to be a security issue, it will be closed with a clear explanation.

---

## Security & Architecture Notes

**Userscript** executes locally within your browser and is architected under strict security and isolation principles:

- **Manifest V3 Architecture & Local Extension Code:** All extension logic (`engine.js`, `background.js`, `content.js`, `popup.js`, `editor.js`) is bundled locally within the extension package and runs inside Manifest V3 service workers (Chromium) and background scripts (Firefox).
- **Isolated `USER_SCRIPT` World & Hybrid Runner:** On Chromium, enabled scripts are registered via `chrome.userScripts` in the dedicated `USER_SCRIPT` world (`messaging: true`), paired with a hybrid `content.js` runner supporting `TrustedTypes` (`userscript-policy`) and a `scripting.executeScript` fallback. On Firefox, the hybrid `content.js` runner and `browser.scripting.executeScript` fallback ensure consistent execution.
- **Privileged Browser URL Exclusion:** Both `engine.js` (`isUrlMatched`) and `content.js` explicitly block script matching and execution on internal and privileged browser schemes (`chrome:`, `edge:`, `about:`, `chrome-extension:`, `moz-extension:`, `devtools:`, `view-source:`, `brave:`, `opera:`, `vivaldi:`).
- **Safe Static Syntax Checking & Wrapper Sanitization:** The built-in editor (`editor.js`) performs syntax validation (`validateScriptSyntax`) using a custom state-machine parser for strings, template literals, comments, and brackets without ever calling `eval`. When wrapping scripts in `buildUserScriptCode`, closing `</script>` tags and escaped HTML entities are sanitized to prevent DOM injection breakage, and `data-userscript-run-*` guards prevent duplicate execution across worlds.
- **Strict Local Persistence & No Background Telemetry:** All scripts, settings, and `GM_*` values are stored locally via `storage.local` (`scriptStorage`). The extension contains zero tracking SDKs, analytics beacons, or background telemetry collectors.

Users are encouraged to:

- Keep **Userscript** updated to the latest release.
- Install the extension only from the official repository ([hamzabellouch/userscript-ex](https://github.com/hamzabellouch/userscript-ex)) or verified store listings.
- Avoid installing modified, repackaged, or unofficial third-party builds.
- Carefully inspect third-party `.user.js` scripts—especially their `@match`, `@require`, `@connect`, and `@grant` (such as `GM_xmlhttpRequest`) headers—before installing or enabling them.
- Report any unexpected behavior that could affect security or browser stability.

Security, user privacy, and safe local script execution are foundational priorities for this project.
