/**
 * Userscript - Userscript Engine Shared Utilities
 * Metadata parsing, URL pattern matching, script ID generation & default templates.
 */

const UserscriptEngine = (function () {
  'use strict';

  /**
   * Parse Userscript metadata header (// ==UserScript== ... // ==/UserScript==)
   * @param {string} code 
   * @returns {object} Parsed metadata
   */
  function parseUserScriptMeta(code) {
    const metaRegex = /\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/m;
    const match = (code || '').match(metaRegex);

    const meta = {
      name: '',
      namespace: '',
      version: '1.0.0',
      description: '',
      author: '',
      homepage: '',
      icon: '',
      matches: [],
      includes: [],
      excludes: [],
      grants: [],
      requires: [],
      resources: {},
      connects: [],
      runAt: 'document-idle',
      downloadURL: '',
      updateURL: '',
      license: '',
      rawMeta: ''
    };

    if (!match) {
      meta.name = 'Untitled Userscript';
      meta.matches = ['<all_urls>'];
      return meta;
    }

    meta.rawMeta = match[1];
    const lines = match[1].split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('//')) continue;

      const directiveMatch = trimmed.match(/^\/\/\s*@([a-zA-Z0-9_\-]+)\s*(.*)$/);
      if (!directiveMatch) continue;

      const key = directiveMatch[1].trim();
      const val = directiveMatch[2].trim();

      switch (key.toLowerCase()) {
        case 'name':
          if (!meta.name) meta.name = val;
          break;
        case 'namespace':
          meta.namespace = val;
          break;
        case 'version':
          meta.version = val;
          break;
        case 'description':
          meta.description = val;
          break;
        case 'author':
          meta.author = val;
          break;
        case 'homepage':
        case 'homepageurl':
        case 'website':
        case 'source':
          meta.homepage = val;
          break;
        case 'icon':
        case 'defaulticon':
        case 'icon64':
          meta.icon = val;
          break;
        case 'match':
          if (val && !meta.matches.includes(val)) meta.matches.push(val);
          break;
        case 'include':
          if (val && !meta.includes.includes(val)) meta.includes.push(val);
          break;
        case 'exclude':
          if (val && !meta.excludes.includes(val)) meta.excludes.push(val);
          break;
        case 'grant':
          if (val && !meta.grants.includes(val)) meta.grants.push(val);
          break;
        case 'require':
          if (val && !meta.requires.includes(val)) meta.requires.push(val);
          break;
        case 'resource': {
          const parts = val.split(/\s+/);
          if (parts.length >= 2) {
            meta.resources[parts[0]] = parts[1];
          }
          break;
        }
        case 'connect':
          if (val && !meta.connects.includes(val)) meta.connects.push(val);
          break;
        case 'run-at': {
          const normRunAt = val.toLowerCase().replace(/_/g, '-');
          if (['document-start', 'document-body', 'document-end', 'document-idle'].includes(normRunAt)) {
            meta.runAt = normRunAt;
          }
          break;
        }
        case 'downloadurl':
          meta.downloadURL = val;
          break;
        case 'updateurl':
          meta.updateURL = val;
          break;
        case 'license':
          meta.license = val;
          break;
      }
    }

    if (!meta.name) meta.name = 'Untitled Userscript';
    if (meta.matches.length === 0 && meta.includes.length === 0) {
      meta.matches = ['<all_urls>'];
    }

    if (!['document-start', 'document-body', 'document-end', 'document-idle'].includes(meta.runAt)) {
      meta.runAt = 'document-idle';
    }

    return meta;
  }

  /**
   * Convert match pattern or glob to RegExp
   * @param {string} pattern 
   * @returns {RegExp|null}
   */
  function patternToRegExp(pattern) {
    if (!pattern) return null;
    pattern = pattern.trim();

    // Regex format: /.../
    if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
      try {
        return new RegExp(pattern.slice(1, -1));
      } catch (e) {
        return null;
      }
    }

    // Special <all_urls>
    if (pattern === '<all_urls>') {
      return /^(?:https?|file|ftp):\/\/.*$/i;
    }

    // Standard match pattern: <scheme>://<host><path>
    const matchPatternRegex = /^(\*|https?|file|ftp):\/\/(\*|\*\.[^/*]+|[^/*]*?)(\/.*)?$/i;
    const match = pattern.match(matchPatternRegex);

    if (match) {
      const scheme = match[1];
      const host = match[2] || '';
      const path = match[3] || '/*';

      let schemeRegex = '';
      if (scheme === '*') {
        schemeRegex = 'https?';
      } else {
        schemeRegex = scheme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      let hostRegex = '';
      if (!host || host === '*') {
        hostRegex = '[^/]*';
      } else if (host.startsWith('*.')) {
        const rest = host.slice(2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        hostRegex = `(?:[^/]+\\.)?${rest}`;
      } else {
        hostRegex = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      const pathRegex = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');

      return new RegExp(`^${schemeRegex}:\\/\\/${hostRegex}${pathRegex}$`, 'i');
    }

    // Simple wildcard fallback (e.g. *google.com*)
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i');
  }

  /**
   * Check if URL matches script pattern rules
   * @param {string} url 
   * @param {string[]} matches 
   * @param {string[]} includes 
   * @param {string[]} excludes 
   * @returns {boolean}
   */
  function isUrlMatched(url, matches = [], includes = [], excludes = []) {
    if (!url) return false;
    // Disallow internal browser URLs
    if (/^(chrome|edge|about|chrome-extension|moz-extension|devtools|view-source|brave|opera|vivaldi):/i.test(url)) {
      return false;
    }

    // 1. Check excludes
    if (Array.isArray(excludes)) {
      for (const excl of excludes) {
        const reg = patternToRegExp(excl);
        if (reg && reg.test(url)) {
          return false;
        }
      }
    }

    // 2. Check matches
    if (Array.isArray(matches)) {
      for (const m of matches) {
        const reg = patternToRegExp(m);
        if (reg && reg.test(url)) {
          return true;
        }
      }
    }

    // 3. Check includes
    if (Array.isArray(includes)) {
      for (const inc of includes) {
        const reg = patternToRegExp(inc);
        if (reg && reg.test(url)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate Unique Script ID
   */
  function generateScriptId() {
    return 'script_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Default template for creating a new script
   * @param {string} name 
   * @param {string} match 
   * @returns {string} Code template
   */
  function generateDefaultScript(name = 'My New Script', match = '*://*/*') {
    return `// ==UserScript==
// @name         ${name}
// @namespace    https://userscript.local/
// @version      1.0.0
// @description  A new userscript created with Userscript
// @author       You
// @match        ${match}
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Userscript] "${name}" is running on: ' + window.location.href);

    // Example: Add custom CSS
    // GM_addStyle('body { border-top: 4px solid #6366f1 !important; }');

    // Example: Notification
    // GM_notification({ text: 'Script loaded successfully!', title: '${name}' });
})();
`;
  }

  return {
    parseUserScriptMeta,
    patternToRegExp,
    isUrlMatched,
    generateScriptId,
    generateDefaultScript
  };
})();

// Export for Node/CommonJS environments if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserscriptEngine;
}
