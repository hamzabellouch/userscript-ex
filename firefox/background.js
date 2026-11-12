/**
 * Userscript - Background Script (Firefox MV3)
 */

if (typeof UserscriptEngine === 'undefined' && typeof importScripts === 'function') {
  try {
    importScripts('engine.js');
  } catch (e) {
    console.error('[Userscript Firefox Background] Error loading engine.js:', e);
  }
}

// Polyfill cross-browser API namespace
const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

// Setup DeclarativeNetRequest rules to remove CSP response headers so userscripts can execute freely
async function setupCspRules() {
  if (!api.declarativeNetRequest) {
    return;
  }
  const updateRules = api.declarativeNetRequest.updateSessionRules
    ? api.declarativeNetRequest.updateSessionRules.bind(api.declarativeNetRequest)
    : (api.declarativeNetRequest.updateDynamicRules
        ? api.declarativeNetRequest.updateDynamicRules.bind(api.declarativeNetRequest)
        : null);

  if (!updateRules) return;

  const RULE_ID = 9999;
  try {
    await updateRules({
      removeRuleIds: [RULE_ID],
      addRules: [{
        id: RULE_ID,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'content-security-policy', operation: 'remove' },
            { header: 'content-security-policy-report-only', operation: 'remove' },
            { header: 'x-content-security-policy', operation: 'remove' },
            { header: 'x-webkit-csp', operation: 'remove' }
          ]
        },
        condition: {
          urlFilter: '*',
          resourceTypes: ['main_frame', 'sub_frame']
        }
      }]
    });
    console.log('[Userscript Firefox] DeclarativeNetRequest CSP-bypass rules successfully activated.');
  } catch (err) {
    console.warn('[Userscript Firefox] Failed to activate DNR CSP rules:', err);
  }
}

// Ensure default storage initialized
async function initStorage() {
  const data = await api.storage.local.get(['scripts', 'settings', 'scriptStorage']);
  const updates = {};

  if (!data.settings) {
    updates.settings = {
      masterEnabled: true,
      autoCheckUpdates: true,
      showBadgeCount: true
    };
  }

  if (!data.scriptStorage) {
    updates.scriptStorage = {};
  }

  if (!data.scripts || !Array.isArray(data.scripts)) {
    updates.scripts = [];
  } else {
    const filtered = data.scripts.filter(s => !s.name || !s.name.startsWith('Welcome to Userscript'));
    if (filtered.length !== data.scripts.length) {
      updates.scripts = filtered;
    }
  }

  if (Object.keys(updates).length > 0) {
    await api.storage.local.set(updates);
  }
}

// Fetch external requires (e.g., jQuery, lodash) and return array of code strings
async function fetchRequires(requireUrls = []) {
  const results = [];
  for (const url of requireUrls) {
    if (!url || typeof url !== 'string') continue;
    try {
      const resp = await fetch(url, { cache: 'force-cache' });
      if (resp.ok) {
        const text = await resp.text();
        results.push({ url, code: text });
      } else {
        console.warn(`[Userscript] Failed to fetch @require from ${url}: Status ${resp.status}`);
        results.push({ url, code: `/* Failed to load @require: ${url} */` });
      }
    } catch (err) {
      console.warn(`[Userscript] Error fetching @require ${url}:`, err);
      results.push({ url, code: `/* Error loading @require: ${url} (${err.message}) */` });
    }
  }
  return results;
}

// Update extension action badge for a tab
async function updateBadge(tabId, count, isEnabled = true) {
  try {
    const actionApi = api.action || api.browserAction;
    if (!actionApi) return;
    if (!isEnabled || count === 0) {
      await actionApi.setBadgeText({ text: '', tabId });
    } else {
      await actionApi.setBadgeText({ text: String(count), tabId });
      await actionApi.setBadgeBackgroundColor({ color: '#6366f1', tabId });
      if (actionApi.setBadgeTextColor) {
        await actionApi.setBadgeTextColor({ color: '#ffffff', tabId });
      }
    }
  } catch (e) {
    // Ignore errors for closed tabs
  }
}

// Compare semantic versions (handles 'v' prefix)
function compareVersions(v1 = '0.0.0', v2 = '0.0.0') {
  const clean1 = String(v1).trim().replace(/^v/i, '');
  const clean2 = String(v2).trim().replace(/^v/i, '');
  const p1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const p2 = clean2.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

// Build self-contained executable userscript wrapper
function buildUserScriptCode(script, initialStorage = {}) {
  const jsonStorage = JSON.stringify(initialStorage || {});
  const jsonMeta = JSON.stringify({
    name: script.name || 'userscript',
    version: script.version || '1.0.0',
    description: script.description || '',
    author: script.author || '',
    namespace: script.namespace || '',
    runAt: script.runAt || 'document-idle',
    grants: script.grants || [],
    matches: script.matches || [],
    includes: script.includes || [],
    excludes: script.excludes || []
  });
  const scriptId = JSON.stringify(script.id || '');
  const scriptName = JSON.stringify(script.name || 'userscript');

  let requiresCode = '';
  if (Array.isArray(script.requiredCode)) {
    for (const req of script.requiredCode) {
      if (req && req.code) {
        requiresCode += req.code + '\n;\n';
      }
    }
  }

  // Escape closing script tags to prevent DOM injection breakage
  let cleanUserCode = (script.code || '')
    .replace(/\\u003c/gi, '<')
    .replace(/\\u003e/gi, '>')
    .replace(/\\u0026/gi, '&')
    .replace(/<\/script>/gi, '<\\/script>');

  return `
(function() {
  'use strict';
  const __scriptId = ${scriptId};
  const __scriptName = ${scriptName};
  const __scriptStorage = ${jsonStorage};
  const __scriptMeta = ${jsonMeta};

  // Prevent multiple executions across isolated and main worlds
  if (typeof document !== 'undefined' && document.documentElement) {
    if (document.documentElement.hasAttribute('data-userscript-run-' + __scriptId)) return;
    document.documentElement.setAttribute('data-userscript-run-' + __scriptId, 'true');
  }
  if (!window.__userscript_runtime_loaded) window.__userscript_runtime_loaded = new Set();
  if (window.__userscript_runtime_loaded.has(__scriptId)) return;
  window.__userscript_runtime_loaded.add(__scriptId);

  const GM_info = {
    script: __scriptMeta,
    scriptHandler: 'Userscript',
    version: '1.0.0'
  };

  function GM_addStyle(css) {
    try {
      const style = document.createElement('style');
      style.setAttribute('data-userscript', __scriptName);
      style.textContent = css;
      const target = document.head || document.documentElement || document.body;
      if (target) {
        target.appendChild(style);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          (document.head || document.documentElement || document.body).appendChild(style);
        }, { once: true });
      }
      return style;
    } catch (e) {
      console.warn('[Userscript] GM_addStyle error:', e);
    }
  }

  function GM_setValue(key, value) {
    __scriptStorage[key] = value;
    window.postMessage({
      type: 'USERSCRIPT_MSG',
      detail: { action: 'setGMValue', scriptId: __scriptId, key: key, value: value }
    }, '*');
  }

  function GM_getValue(key, defaultValue) {
    if (key in __scriptStorage) {
      return __scriptStorage[key];
    }
    return defaultValue;
  }

  function GM_deleteValue(key) {
    delete __scriptStorage[key];
    window.postMessage({
      type: 'USERSCRIPT_MSG',
      detail: { action: 'deleteGMValue', scriptId: __scriptId, key: key }
    }, '*');
  }

  function GM_listValues() {
    return Object.keys(__scriptStorage);
  }

  let __xmlHttpReqCounter = 0;
  const __xmlHttpCallbacks = {};

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'USERSCRIPT_XHR_RESP') return;
    const { reqId, resp } = event.data;
    const cb = __xmlHttpCallbacks[reqId];
    if (cb) {
      delete __xmlHttpCallbacks[reqId];
      if (resp && resp.error) {
        if (typeof cb.onerror === 'function') cb.onerror(resp);
      } else {
        if (typeof cb.onreadystatechange === 'function') cb.onreadystatechange(resp);
        if (typeof cb.onload === 'function') cb.onload(resp);
      }
    }
  });

  function GM_xmlhttpRequest(details) {
    const reqId = 'xhr_' + (++__xmlHttpReqCounter) + '_' + Date.now();
    __xmlHttpCallbacks[reqId] = details;
    let targetUrl = details.url;
    try {
      targetUrl = new URL(details.url, window.location.href).href;
    } catch (_) {}

    window.postMessage({
      type: 'USERSCRIPT_XHR',
      reqId: reqId,
      detail: {
        action: 'GM_xmlhttpRequest',
        details: {
          method: details.method || 'GET',
          url: targetUrl,
          headers: details.headers,
          data: details.data,
          timeout: details.timeout || 30000,
          responseType: details.responseType
        }
      }
    }, '*');
  }

  function GM_notification(details, titleParam, imageParam) {
    let text = '';
    let title = __scriptName;
    let image = '';
    if (typeof details === 'string') {
      text = details;
      if (titleParam) title = titleParam;
      if (imageParam) image = imageParam;
    } else if (details && typeof details === 'object') {
      text = details.text || '';
      if (details.title) title = details.title;
      if (details.image) image = details.image;
    }
    window.postMessage({
      type: 'USERSCRIPT_MSG',
      detail: { action: 'GM_notification', text, title, image }
    }, '*');
  }

  function GM_setClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(text)).catch(() => {
        try {
          const ta = document.createElement('textarea');
          ta.value = String(text);
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          (document.body || document.documentElement).appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        } catch (_) {}
      });
    }
  }

  function GM_openInTab(url, options) {
    let active = true;
    if (typeof options === 'boolean') {
      active = !options;
    } else if (options && typeof options === 'object') {
      if (options.active !== undefined) active = Boolean(options.active);
      else if (options.loadInBackground !== undefined) active = !options.loadInBackground;
    }
    window.postMessage({
      type: 'USERSCRIPT_MSG',
      detail: { action: 'GM_openInTab', url: url, active: active }
    }, '*');
  }

  const GM = {
    info: GM_info,
    getValue: async (key, defaultValue) => GM_getValue(key, defaultValue),
    setValue: async (key, value) => { GM_setValue(key, value); return Promise.resolve(); },
    deleteValue: async (key) => { GM_deleteValue(key); return Promise.resolve(); },
    listValues: async () => Promise.resolve(GM_listValues()),
    addStyle: (css) => GM_addStyle(css),
    xmlHttpRequest: (details) => GM_xmlhttpRequest(details),
    notification: (details, ondone) => GM_notification(details),
    setClipboard: (text) => GM_setClipboard(text),
    openInTab: (url, options) => GM_openInTab(url, options)
  };

  const unsafeWindow = (typeof window !== 'undefined' && window.wrappedJSObject) ? window.wrappedJSObject : ((typeof window !== 'undefined') ? window : this);

  try {
    ${requiresCode}
    ${cleanUserCode}
  } catch (err) {
    console.error("[Userscript] Runtime error in '" + __scriptName + "':", err);
  }
})();
`;
}

// Unified Message Handler
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action } = message;

  if (action === 'getScriptsForUrl') {
    (async () => {
      try {
        const { url } = message;
        const data = await api.storage.local.get(['scripts', 'settings', 'scriptStorage']);
        const masterEnabled = data.settings?.masterEnabled !== false;
        const scripts = data.scripts || [];
        const scriptStorage = data.scriptStorage || {};

        const isTop = (sender.frameId === 0 || sender.frameId === undefined || message.isTopFrame === true);

        if (!masterEnabled || !url) {
          if (sender.tab?.id && isTop) {
            updateBadge(sender.tab.id, 0, false);
          }
          sendResponse({ masterEnabled: false, scripts: [], scriptStorage: {} });
          return;
        }

        const matchedScripts = scripts.filter(s => {
          return s.enabled !== false && UserscriptEngine.isUrlMatched(url, s.matches, s.includes, s.excludes);
        });

        if (sender.tab?.id && isTop && data.settings?.showBadgeCount !== false) {
          updateBadge(sender.tab.id, matchedScripts.length, true);
        }

        const relevantStorage = {};
        for (const s of matchedScripts) {
          relevantStorage[s.id] = scriptStorage[s.id] || {};
        }

        const scriptsWithCode = matchedScripts.map(s => ({
          id: s.id,
          name: s.name,
          runAt: s.runAt || 'document-idle',
          wrappedCode: buildUserScriptCode(s, relevantStorage[s.id] || {})
        }));

        sendResponse({
          masterEnabled: true,
          scripts: scriptsWithCode,
          scriptStorage: relevantStorage
        });
      } catch (err) {
        console.error('[Userscript Firefox] Error in getScriptsForUrl:', err);
        sendResponse({ masterEnabled: false, scripts: [], scriptStorage: {}, error: err.message });
      }
    })();
    return true;
  }

  if (action === 'setGMValue') {
    (async () => {
      const { scriptId, key, value } = message;
      if (!scriptId || !key) return sendResponse({ success: false });
      const data = await api.storage.local.get(['scriptStorage']);
      const storage = data.scriptStorage || {};
      if (!storage[scriptId]) storage[scriptId] = {};
      storage[scriptId][key] = value;
      await api.storage.local.set({ scriptStorage: storage });
      sendResponse({ success: true });
    })();
    return true;
  }

  if (action === 'deleteGMValue') {
    (async () => {
      const { scriptId, key } = message;
      if (!scriptId || !key) return sendResponse({ success: false });
      const data = await api.storage.local.get(['scriptStorage']);
      const storage = data.scriptStorage || {};
      if (storage[scriptId] && key in storage[scriptId]) {
        delete storage[scriptId][key];
        await api.storage.local.set({ scriptStorage: storage });
      }
      sendResponse({ success: true });
    })();
    return true;
  }

  if (action === 'GM_xmlhttpRequest') {
    (async () => {
      const { details } = message;
      try {
        const fetchOptions = {
          method: details.method || 'GET',
          headers: details.headers || {}
        };

        if (details.data && !['GET', 'HEAD'].includes((details.method || '').toUpperCase())) {
          fetchOptions.body = details.data;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), details.timeout || 30000);
        fetchOptions.signal = controller.signal;

        const response = await fetch(details.url, fetchOptions);
        clearTimeout(timeoutId);

        const responseText = await response.text();
        const headersObj = {};
        let responseHeadersStr = '';
        response.headers.forEach((val, key) => {
          headersObj[key] = val;
          responseHeadersStr += key + ': ' + val + '\r\n';
        });

        let parsedResponse = responseText;
        if (details.responseType === 'json') {
          try {
            parsedResponse = JSON.parse(responseText);
          } catch (_) {}
        }

        sendResponse({
          status: response.status,
          statusText: response.statusText,
          readyState: 4,
          responseText: responseText,
          response: parsedResponse,
          responseHeaders: responseHeadersStr,
          headers: headersObj,
          finalUrl: response.url
        });
      } catch (err) {
        sendResponse({ error: err.message || 'Request failed' });
      }
    })();
    return true;
  }

  if (action === 'executeScriptInTab') {
    if (api.scripting && api.scripting.executeScript && sender.tab?.id) {
      api.scripting.executeScript({
        target: { tabId: sender.tab.id, frameIds: [sender.frameId || 0] },
        func: (code) => {
          try {
            const script = document.createElement('script');
            script.textContent = code;
            const target = document.head || document.documentElement || document.body;
            if (target) {
              target.appendChild(script);
              script.remove();
            }
          } catch (e) {
            console.error('[Userscript Firefox Scripting Error]:', e);
          }
        },
        args: [message.code]
      }).catch(err => {
        console.warn('[Userscript Firefox] Scripting fallback failed:', err);
      });
    }
    sendResponse({ success: true });
    return false;
  }

  if (action === 'GM_notification') {
    const { text, title, image } = message;
    if (api.notifications) {
      api.notifications.create({
        type: 'basic',
        iconUrl: image || 'icons/icon-128.png',
        title: title || 'Userscript Notification',
        message: text || ''
      });
    }
    sendResponse({ success: true });
    return false;
  }

  if (action === 'GM_openInTab') {
    const { url, active } = message;
    if (url) {
      api.tabs.create({ url, active: active !== false });
    }
    sendResponse({ success: true });
    return false;
  }

  if (action === 'fetchScriptFromUrl') {
    (async () => {
      try {
        const { url } = message;
        if (!url) throw new Error('No URL provided');

        const resp = await fetch(url, { cache: 'no-cache' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const code = await resp.text();

        const meta = UserscriptEngine.parseUserScriptMeta(code);
        let requiredCode = [];
        if (meta.requires && meta.requires.length > 0) {
          requiredCode = await fetchRequires(meta.requires);
        }

        const scriptObj = {
          id: UserscriptEngine.generateScriptId(),
          name: meta.name || url.split('/').pop().replace(/(\.user)?\.js$/, ''),
          namespace: meta.namespace || '',
          version: meta.version || '1.0.0',
          description: meta.description || '',
          author: meta.author || '',
          icon: meta.icon || '',
          runAt: meta.runAt || 'document-idle',
          matches: meta.matches.length > 0 ? meta.matches : ['<all_urls>'],
          includes: meta.includes || [],
          excludes: meta.excludes || [],
          grants: meta.grants || [],
          requires: meta.requires || [],
          requiredCode: requiredCode,
          code: code,
          meta: meta,
          enabled: true,
          sourceUrl: url,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        sendResponse({
          success: true,
          script: scriptObj,
          code: code,
          meta: meta,
          name: scriptObj.name
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (action === 'saveScript') {
    (async () => {
      try {
        const { script } = message;
        if (!script || !script.code) throw new Error('Invalid script data');

        script.code = script.code
          .replace(/\\u003c/gi, '<')
          .replace(/\\u003e/gi, '>')
          .replace(/\\u0026/gi, '&');

        const meta = UserscriptEngine.parseUserScriptMeta(script.code);
        let requiredCode = script.requiredCode || [];

        const reqUrls = meta.requires || [];
        const existingUrls = (requiredCode || []).map(r => r.url);
        const needsFetch = reqUrls.some(u => !existingUrls.includes(u));

        if (needsFetch || (reqUrls.length > 0 && requiredCode.length === 0)) {
          requiredCode = await fetchRequires(reqUrls);
        }

        const data = await api.storage.local.get(['scripts']);
        let scripts = data.scripts || [];

        const existingIndex = scripts.findIndex(s => s.id === script.id);

        const updatedScript = {
          ...script,
          id: script.id || UserscriptEngine.generateScriptId(),
          name: meta.name || script.name || 'Untitled Script',
          namespace: meta.namespace || script.namespace || '',
          version: meta.version || script.version || '1.0.0',
          description: meta.description || script.description || '',
          author: meta.author || script.author || '',
          icon: meta.icon || script.icon || '',
          runAt: meta.runAt || script.runAt || 'document-idle',
          matches: meta.matches.length > 0 ? meta.matches : (script.matches || ['<all_urls>']),
          includes: meta.includes || script.includes || [],
          excludes: meta.excludes || script.excludes || [],
          grants: meta.grants || script.grants || [],
          requires: meta.requires || script.requires || [],
          requiredCode: requiredCode,
          meta: meta,
          enabled: script.enabled !== undefined ? script.enabled : true,
          updatedAt: Date.now()
        };

        if (existingIndex >= 0) {
          scripts[existingIndex] = updatedScript;
        } else {
          updatedScript.createdAt = Date.now();
          scripts.push(updatedScript);
        }

        await api.storage.local.set({ scripts });
        sendResponse({ success: true, script: updatedScript, scriptId: updatedScript.id });
      } catch (err) {
        console.error('[Userscript] Error saving script:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (action === 'toggleMaster') {
    (async () => {
      try {
        const data = await api.storage.local.get(['settings']);
        const settings = data.settings || {};
        const current = settings.masterEnabled !== false;
        settings.masterEnabled = !current;
        await api.storage.local.set({ settings });

        const tabs = await api.tabs.query({});
        for (const t of tabs) {
          if (!settings.masterEnabled && t.id) {
            updateBadge(t.id, 0, false);
          }
        }

        sendResponse({ success: true, masterEnabled: settings.masterEnabled });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (action === 'toggleScript') {
    (async () => {
      try {
        const { scriptId, enabled } = message;
        const data = await api.storage.local.get(['scripts']);
        const scripts = data.scripts || [];
        const script = scripts.find(s => s.id === scriptId);
        if (script) {
          script.enabled = enabled !== undefined ? enabled : !script.enabled;
          script.updatedAt = Date.now();
          await api.storage.local.set({ scripts });
          sendResponse({ success: true, enabled: script.enabled });
        } else {
          sendResponse({ success: false, error: 'Script not found' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (action === 'deleteScript') {
    (async () => {
      try {
        const { scriptId } = message;
        const data = await api.storage.local.get(['scripts', 'scriptStorage']);
        let scripts = data.scripts || [];
        const storage = data.scriptStorage || {};

        scripts = scripts.filter(s => s.id !== scriptId);
        if (storage[scriptId]) {
          delete storage[scriptId];
        }

        await api.storage.local.set({ scripts, scriptStorage: storage });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (action === 'checkScriptUpdate') {
    (async () => {
      try {
        const { scriptId } = message;
        const data = await api.storage.local.get(['scripts']);
        const scripts = data.scripts || [];
        const script = scripts.find(s => s.id === scriptId);
        if (!script) throw new Error('Script not found');

        const updateUrl = script.meta?.updateURL || script.meta?.downloadURL || script.sourceUrl;
        if (!updateUrl) {
          sendResponse({ success: false, message: 'No update URL found for this script' });
          return;
        }

        const resp = await fetch(updateUrl, { cache: 'no-cache' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const remoteCode = await resp.text();
        const remoteMeta = UserscriptEngine.parseUserScriptMeta(remoteCode);

        const hasUpdate = compareVersions(remoteMeta.version, script.version) > 0;
        sendResponse({
          success: true,
          hasUpdate,
          currentVersion: script.version,
          latestVersion: remoteMeta.version,
          remoteCode: remoteCode
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (action === 'openEditor') {
    const { scriptId, urlToMatch, name, action: editorAction } = message;
    let targetUrl = 'editor.html';
    const params = [];
    if (scriptId) params.push(`id=${encodeURIComponent(scriptId)}`);
    if (editorAction) params.push(`action=${encodeURIComponent(editorAction)}`);
    if (urlToMatch) params.push(`match=${encodeURIComponent(urlToMatch)}`);
    if (name) params.push(`name=${encodeURIComponent(name)}`);
    if (params.length > 0) targetUrl += `?${params.join('&')}`;

    api.tabs.create({ url: targetUrl });
    sendResponse({ success: true });
    return false;
  }

  return false;
});

// Storage change listener to clear badges on master disable
api.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.settings && changes.settings.newValue?.masterEnabled === false) {
    api.tabs.query({}).then(tabs => {
      for (const t of tabs) {
        if (t.id) updateBadge(t.id, 0, false);
      }
    }).catch(() => {});
  }
});

// Setup Context Menus
function setupContextMenus() {
  if (!api.contextMenus) return;
  api.contextMenus.removeAll(() => {
    if (api.runtime.lastError) {}
    try {
      api.contextMenus.create({
        id: 'userscript_dashboard',
        title: 'Userscript: Open Dashboard',
        contexts: ['page']
      }, () => { if (api.runtime.lastError) {} });

      api.contextMenus.create({
        id: 'userscript_create_for_site',
        title: 'Userscript: Create Script for this site',
        contexts: ['page']
      }, () => { if (api.runtime.lastError) {} });
    } catch (_) {}
  });
}

if (api.contextMenus?.onClicked) {
  api.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'userscript_dashboard') {
      api.tabs.create({ url: 'editor.html' });
    } else if (info.menuItemId === 'userscript_create_for_site' && tab?.url) {
      try {
        const urlObj = new URL(tab.url);
        const matchPattern = `*://${urlObj.hostname}/*`;
        api.tabs.create({ url: `editor.html?action=new&match=${encodeURIComponent(matchPattern)}&name=${encodeURIComponent(urlObj.hostname + ' Tweaks')}` });
      } catch (e) {
        api.tabs.create({ url: 'editor.html?action=new' });
      }
    }
  });
}

api.runtime.onInstalled.addListener(() => {
  initStorage();
  setupCspRules();
  setupContextMenus();
});

api.runtime.onStartup.addListener(() => {
  setupCspRules();
  setupContextMenus();
});

initStorage().then(() => {
  setupCspRules();
});
