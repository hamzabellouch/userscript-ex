/**
 * Userscript - Content Script (Chromium MV3 Universal Hybrid Runner)
 * Direct injection + Trusted Types support + SPA Navigation Observer + Extension Bridge
 */

(function () {
  'use strict';

  let currentUrl = window.location.href;
  if (!currentUrl || /^(view-source|chrome|edge|about|devtools):/i.test(currentUrl)) return;

  const isTopFrame = (window === window.top);
  const api = typeof chrome !== 'undefined' ? chrome : (typeof browser !== 'undefined' ? browser : null);
  if (!api || !api.runtime) return;

  // Check if extension context is still valid (detect extension reload / update)
  function isContextValid() {
    try {
      return Boolean(api && api.runtime && api.runtime.id);
    } catch (_) {
      return false;
    }
  }

  // Safe wrapper for sending runtime messages without throwing if context is invalidated
  function safeSendMessage(message, callback) {
    if (!isContextValid()) return false;
    try {
      api.runtime.sendMessage(message, (resp) => {
        const _ = api.runtime.lastError;
        if (typeof callback === 'function' && !_) {
          callback(resp);
        }
      });
      return true;
    } catch (e) {
      // Extension context invalidated (e.g. extension updated/reloaded)
      return false;
    }
  }

  // Track executed scripts in this frame
  const executedInFrame = new Set();

  // Trusted Types policy for sites enforcing Trusted Types (e.g. YouTube, Google)
  let trustedScriptPolicy = null;
  if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      trustedScriptPolicy = window.trustedTypes.createPolicy('userscript-policy', {
        createScript: (s) => s,
        createScriptURL: (s) => s
      });
    } catch (e) {
      try {
        trustedScriptPolicy = window.trustedTypes.defaultPolicy;
      } catch (_) {}
    }
  }

  // Bridge messages between page world and extension background service
  window.addEventListener('message', (event) => {
    if (!isContextValid()) return;
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'USERSCRIPT_MSG' && event.data.detail) {
      safeSendMessage(event.data.detail);
    } else if (event.data.type === 'USERSCRIPT_XHR' && event.data.detail) {
      const reqId = event.data.reqId;
      const sent = safeSendMessage(event.data.detail, (resp) => {
        try {
          window.postMessage({
            type: 'USERSCRIPT_XHR_RESP',
            reqId: reqId,
            resp: resp || { error: 'Request failed' }
          }, '*');
        } catch (_) {}
      });

      if (!sent) {
        try {
          window.postMessage({
            type: 'USERSCRIPT_XHR_RESP',
            reqId: reqId,
            resp: { error: 'Extension context invalidated. Please refresh the page.' }
          }, '*');
        } catch (_) {}
      }
    }
  });

  // Inject wrapped script into page DOM
  function injectIntoPage(scriptObj) {
    if (!scriptObj || !scriptObj.wrappedCode) return;
    if (executedInFrame.has(scriptObj.id)) return;

    // Check if script already executed via chrome.userScripts or earlier runner
    if (document.documentElement && document.documentElement.hasAttribute('data-userscript-run-' + scriptObj.id)) {
      executedInFrame.add(scriptObj.id);
      return;
    }

    function doInject() {
      if (executedInFrame.has(scriptObj.id)) return;
      if (document.documentElement && document.documentElement.hasAttribute('data-userscript-run-' + scriptObj.id)) {
        executedInFrame.add(scriptObj.id);
        return;
      }
      executedInFrame.add(scriptObj.id);

      let injectedSuccessfully = false;
      try {
        const scriptEl = document.createElement('script');
        scriptEl.setAttribute('data-userscript', scriptObj.name || 'userscript');
        scriptEl.setAttribute('data-userscript-id', scriptObj.id);
        if (trustedScriptPolicy && trustedScriptPolicy.createScript) {
          scriptEl.textContent = trustedScriptPolicy.createScript(scriptObj.wrappedCode);
        } else {
          scriptEl.textContent = scriptObj.wrappedCode;
        }

        const target = document.head || document.documentElement || document.body;
        if (target) {
          target.appendChild(scriptEl);
          scriptEl.remove();
          injectedSuccessfully = true;
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            const t = document.head || document.documentElement || document.body;
            if (t) {
              t.appendChild(scriptEl);
              scriptEl.remove();
            }
          }, { once: true });
          injectedSuccessfully = true;
        }
      } catch (err) {
        injectedSuccessfully = false;
      }

      // Fallback: If DOM injection failed or blocked by CSP / Trusted Types, use scripting via background
      if (!injectedSuccessfully) {
        safeSendMessage({
          action: 'executeScriptInTab',
          code: scriptObj.wrappedCode
        });
      }
    }

    const runAt = scriptObj.runAt || 'document-idle';
    if (runAt === 'document-start') {
      doInject();
    } else if (runAt === 'document-body') {
      if (document.body) {
        doInject();
      } else {
        const bodyObserver = new MutationObserver(() => {
          if (document.body) {
            bodyObserver.disconnect();
            doInject();
          }
        });
        bodyObserver.observe(document.documentElement || document, { childList: true, subtree: true });
      }
    } else if (runAt === 'document-end') {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        doInject();
      } else {
        document.addEventListener('DOMContentLoaded', doInject, { once: true });
      }
    } else {
      // document-idle
      if (document.readyState === 'complete') {
        setTimeout(doInject, 1);
      } else if (document.readyState === 'interactive') {
        setTimeout(doInject, 1);
      } else {
        document.addEventListener('DOMContentLoaded', () => setTimeout(doInject, 1), { once: true });
      }
    }
  }

  // Request matched scripts for current URL and execute them
  function executeForCurrentPage(url) {
    if (!isContextValid()) return;
    safeSendMessage({
      action: 'getScriptsForUrl',
      url: url,
      isTopFrame: isTopFrame
    }, (resp) => {
      if (!resp || !resp.masterEnabled || !Array.isArray(resp.scripts)) return;
      for (const script of resp.scripts) {
        injectIntoPage(script);
      }
    });
  }

  // Initial execution on page load
  executeForCurrentPage(currentUrl);

  // Watch for SPA navigations (YouTube, Twitter, GitHub, etc.)
  let lastRecordedUrl = currentUrl;
  function handleUrlChange() {
    if (!isContextValid()) return;
    const newUrl = window.location.href;
    if (newUrl && newUrl !== lastRecordedUrl && !/^(view-source|chrome|edge|about|devtools):/i.test(newUrl)) {
      lastRecordedUrl = newUrl;
      executeForCurrentPage(newUrl);
    }
  }

  window.addEventListener('yt-navigate-finish', handleUrlChange, true);
  window.addEventListener('yt-page-data-updated', handleUrlChange, true);
  window.addEventListener('popstate', handleUrlChange, true);
  window.addEventListener('hashchange', handleUrlChange, true);

  const navInterval = setInterval(() => {
    if (!isContextValid()) {
      clearInterval(navInterval);
      return;
    }
    handleUrlChange();
  }, 600);
})();
