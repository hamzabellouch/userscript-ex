/**
 * Userscript - Dashboard & Code Editor Controller (Firefox)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const api = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  if (!api) return;

  // DOM Elements - Navigation & Sidebar
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const sidebarInstalledCount = document.getElementById('sidebar-installed-count');

  // DOM Elements - Tab 1: Installed
  const installedScriptsGrid = document.getElementById('installed-scripts-grid');
  const dashboardSearch = document.getElementById('dashboard-search');
  const filterStatus = document.getElementById('filter-status');
  const btnCreateNewScript = document.getElementById('btn-create-new-script');
  const btnCheckAllUpdates = document.getElementById('btn-check-all-updates');

  // DOM Elements - Tab 2: Editor
  const editorNavLabel = document.getElementById('editor-nav-label');
  const editorStatusBadge = document.getElementById('editor-status-badge');
  const editorNameInput = document.getElementById('editor-name-input');
  const editorVersionTag = document.getElementById('editor-version-tag');
  const codeTextarea = document.getElementById('code-textarea');
  const lineNumbers = document.getElementById('line-numbers');
  const btnEditorSave = document.getElementById('btn-editor-save');
  const btnEditorCancel = document.getElementById('btn-editor-cancel');
  const btnEditorDownload = document.getElementById('btn-editor-download');
  const quickbarBtns = document.querySelectorAll('.quickbar-btn');

  // Inspector Elements
  const metaDisplayName = document.getElementById('meta-display-name');
  const metaDisplayVersion = document.getElementById('meta-display-version');
  const metaDisplayRunat = document.getElementById('meta-display-runat');
  const metaDisplayMatches = document.getElementById('meta-display-matches');
  const metaDisplayGrants = document.getElementById('meta-display-grants');
  const metaDisplayRequires = document.getElementById('meta-display-requires');
  const syntaxStatus = document.getElementById('syntax-status');

  // DOM Elements - Tab 3: Install
  const dashUrlInput = document.getElementById('dash-url-input');
  const btnDashFetchUrl = document.getElementById('btn-dash-fetch-url');
  const dashUrlPreview = document.getElementById('dash-url-preview');
  const dashPreviewTitle = document.getElementById('dash-preview-title');
  const dashPreviewAuthor = document.getElementById('dash-preview-author');
  const dashPreviewDesc = document.getElementById('dash-preview-desc');
  const dashPreviewMatches = document.getElementById('dash-preview-matches');
  const btnDashConfirmInstall = document.getElementById('btn-dash-confirm-install');
  const dashDropZone = document.getElementById('dash-drop-zone');
  const dashFileInput = document.getElementById('dash-file-input');
  const btnDashCreateTemplate = document.getElementById('btn-dash-create-template');

  // DOM Elements - Tab 4: Settings
  const settingsMasterToggle = document.getElementById('settings-master-toggle');
  const settingsBadgeToggle = document.getElementById('settings-badge-toggle');
  const settingsAutoupdateToggle = document.getElementById('settings-autoupdate-toggle');
  const btnExportBackup = document.getElementById('btn-export-backup');
  const btnImportBackup = document.getElementById('btn-import-backup');
  const backupFileInput = document.getElementById('backup-file-input');

  const toast = document.getElementById('toast');

  // State
  let allScripts = [];
  let settings = {};
  let currentEditingScriptId = null;
  let fetchedInstallScript = null;

  // Helper: Toast
  function showToast(text, duration = 2500) {
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Switch Tabs
  function switchTab(tabName) {
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabName}`);
    });

    if (tabName === 'editor') {
      updateLineNumbers();
      inspectMetadataLive();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab);
    });
  });

  // Load state from storage
  async function loadData() {
    const data = await api.storage.local.get(['scripts', 'settings']);
    allScripts = (data.scripts || []).filter(s => !s.name || !s.name.startsWith('Welcome to Userscript'));
    if (data.scripts && data.scripts.length !== allScripts.length) {
      await api.storage.local.set({ scripts: allScripts });
    }
    settings = data.settings || { masterEnabled: true, autoCheckUpdates: true, showBadgeCount: true };

    sidebarInstalledCount.textContent = allScripts.length;

    // Settings tab sync
    const isMasterOn = settings.masterEnabled !== false;
    settingsMasterToggle.checked = isMasterOn;
    settingsBadgeToggle.checked = settings.showBadgeCount !== false;
    settingsAutoupdateToggle.checked = settings.autoCheckUpdates !== false;

    renderInstalledGrid();
  }

  // Render Tab 1: Installed Scripts
  function renderInstalledGrid() {
    installedScriptsGrid.innerHTML = '';
    const query = dashboardSearch ? (dashboardSearch.value || '').trim().toLowerCase() : '';
    const statusFilter = filterStatus.value;

    const filtered = allScripts.filter(s => {
      // Status filter
      if (statusFilter === 'enabled' && s.enabled === false) return false;
      if (statusFilter === 'disabled' && s.enabled !== false) return false;

      // Query filter
      if (!query) return true;
      const matchPatterns = (s.matches || []).join(' ').toLowerCase();
      return (s.name && s.name.toLowerCase().includes(query)) ||
             (s.description && s.description.toLowerCase().includes(query)) ||
             (s.author && s.author.toLowerCase().includes(query)) ||
             matchPatterns.includes(query);
    });

    if (filtered.length === 0) {
      installedScriptsGrid.innerHTML = `
        <div class="empty-placeholder">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <h4>No Userscripts Found</h4>
          <p>${query ? 'No scripts match your search criteria.' : 'You have not installed any userscripts yet.'}</p>
          <button class="btn btn-primary" id="btn-empty-add">Add Your First Script</button>
        </div>
      `;
      const emptyAdd = document.getElementById('btn-empty-add');
      if (emptyAdd) {
        emptyAdd.addEventListener('click', () => switchTab('install'));
      }
      return;
    }

    filtered.forEach(script => {
      const card = document.createElement('div');
      card.className = `script-card ${script.enabled !== false ? 'active-card' : ''}`;
      card.dataset.id = script.id;

      let avatarHtml = `<div class="card-avatar">JS</div>`;
      if (script.icon) {
        avatarHtml = `<div class="card-avatar"><img class="card-avatar-img" src="${escapeHtml(script.icon)}" alt=""></div>`;
      } else if (script.name) {
        avatarHtml = `<div class="card-avatar">${escapeHtml(script.name.charAt(0).toUpperCase())}</div>`;
      }

      const matchChips = (script.matches || ['<all_urls>']).slice(0, 3).map(m => {
        return `<span class="match-chip" title="${escapeHtml(m)}">${escapeHtml(m)}</span>`;
      }).join('');

      card.innerHTML = `
        <div class="card-top">
          <div class="card-identity">
            ${avatarHtml}
            <div class="card-header-info">
              <div class="card-title-row">
                <span class="card-title" title="${escapeHtml(script.name)}">${escapeHtml(script.name)}</span>
                <span class="card-version">v${escapeHtml(script.version || '1.0')}</span>
              </div>
              <span class="card-author">${escapeHtml(script.author ? 'by ' + script.author : 'Custom script')}</span>
            </div>
          </div>
          <label class="switch" title="Toggle script active state">
            <input type="checkbox" class="card-toggle" ${script.enabled !== false ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>

        <div class="card-desc">${escapeHtml(script.description || 'No description provided.')}</div>

        <div class="card-matches">
          ${matchChips}
          ${(script.matches || []).length > 3 ? `<span class="match-chip">+${script.matches.length - 3} more</span>` : ''}
        </div>

        <div class="card-bottom">
          <div class="card-bottom-actions">
            <button class="btn-icon-pill edit-card-btn">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button class="btn-icon-pill export-card-btn" title="Download .user.js">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button class="btn-icon-pill update-card-btn" title="Check for updates">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
            <button class="btn-icon-pill danger delete-card-btn" title="Delete script">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Card Avatar Image Fallback
      const avatarImg = card.querySelector('.card-avatar-img');
      if (avatarImg) {
        avatarImg.addEventListener('error', () => {
          if (avatarImg.parentNode) avatarImg.parentNode.textContent = 'JS';
        }, { once: true });
      }

      // Card Events
      const cardToggle = card.querySelector('.card-toggle');
      cardToggle.addEventListener('change', async (e) => {
        const isEnabled = e.target.checked;
        await api.runtime.sendMessage({ action: 'toggleScript', scriptId: script.id, enabled: isEnabled });
        script.enabled = isEnabled;
        card.classList.toggle('active-card', isEnabled);
        showToast(isEnabled ? `"${script.name}" enabled` : `"${script.name}" disabled`);
      });

      card.querySelector('.edit-card-btn').addEventListener('click', () => {
        openInEditor(script.id);
      });

      card.querySelector('.export-card-btn').addEventListener('click', () => {
        exportScriptFile(script);
      });

      card.querySelector('.update-card-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.style.opacity = '0.5';
        try {
          const res = await api.runtime.sendMessage({ action: 'checkScriptUpdate', scriptId: script.id });
          if (res && res.success) {
            if (res.hasUpdate) {
              if (confirm(`New update available (v${res.latestVersion})! Update now?`)) {
                script.code = res.remoteCode;
                await api.runtime.sendMessage({ action: 'saveScript', script });
                showToast(`Updated to v${res.latestVersion}!`);
                loadData();
              }
            } else {
              showToast(`"${script.name}" is up to date (v${script.version})`);
            }
          } else {
            showToast(res?.message || 'No update found');
          }
        } catch (err) {
          showToast(`Update check failed: ${err.message}`);
        } finally {
          btn.style.opacity = '1';
        }
      });

      card.querySelector('.delete-card-btn').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${script.name}"?`)) {
          await api.runtime.sendMessage({ action: 'deleteScript', scriptId: script.id });
          showToast('Script deleted');
          loadData();
        }
      });

      installedScriptsGrid.appendChild(card);
    });
  }

  // Open Script in Code Editor
  function openInEditor(scriptId = null, templateData = null) {
    if (scriptId) {
      const script = allScripts.find(s => s.id === scriptId);
      if (script) {
        currentEditingScriptId = script.id;
        editorNameInput.value = script.name || 'Untitled Script';
        editorVersionTag.textContent = `v${script.version || '1.0.0'}`;
        editorStatusBadge.textContent = 'Editing';
        codeTextarea.value = script.code || '';
        if (editorNavLabel) editorNavLabel.textContent = `Edit: ${(script.name || '').slice(0, 14)}`;
      }
    } else {
      // New Script
      currentEditingScriptId = null;
      const scriptName = templateData?.name || 'My New Script';
      const match = templateData?.match || '*://*/*';
      editorNameInput.value = scriptName;
      editorVersionTag.textContent = 'v1.0.0';
      editorStatusBadge.textContent = 'New Script';
      codeTextarea.value = UserscriptEngine.generateDefaultScript(scriptName, match);
      if (editorNavLabel) editorNavLabel.textContent = 'New Script';
    }

    switchTab('editor');
    updateLineNumbers();
    inspectMetadataLive();
  }

  // Update Line Numbers in Editor
  function updateLineNumbers() {
    const lines = (codeTextarea.value || '').split('\n').length;
    let numsStr = '';
    for (let i = 1; i <= lines; i++) {
      numsStr += i + '\n';
    }
    lineNumbers.textContent = numsStr;
  }

  // Sync scroll
  codeTextarea.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeTextarea.scrollTop;
  });

  // Handle Tab key and shortcuts in editor
  codeTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeTextarea.selectionStart;
      const end = codeTextarea.selectionEnd;
      codeTextarea.value = codeTextarea.value.substring(0, start) + '    ' + codeTextarea.value.substring(end);
      codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 4;
      updateLineNumbers();
    }

    // Ctrl+S / Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentEditorScript();
    }
  });

  codeTextarea.addEventListener('input', () => {
    updateLineNumbers();
    inspectMetadataLive();
  });

  // Bidirectional sync: Name input updates @name directive in editor
  editorNameInput.addEventListener('input', () => {
    const newName = editorNameInput.value.trim() || 'Untitled Script';
    const code = codeTextarea.value;
    const nameRegex = /^(\/\/\s*@name\s+).*$/m;
    if (nameRegex.test(code)) {
      codeTextarea.value = code.replace(nameRegex, `$1${newName}`);
    }
    inspectMetadataLive();
  });

  // Quickbar insertion buttons
  quickbarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToInsert = btn.dataset.insert + '\n';
      const code = codeTextarea.value;
      const userScriptEndIdx = code.indexOf('// ==/UserScript==');
      if (userScriptEndIdx >= 0) {
        codeTextarea.value = code.slice(0, userScriptEndIdx) + textToInsert + code.slice(userScriptEndIdx);
      } else {
        codeTextarea.value = textToInsert + code;
      }
      updateLineNumbers();
      inspectMetadataLive();
      showToast(`Inserted ${btn.textContent}`);
    });
  });

  // Accurate Syntax Validator for Userscripts (handles quotes, escaped chars, comments, brackets without eval)
  function validateScriptSyntax(code) {
    if (!code || !code.trim()) {
      return { valid: false, message: 'Empty script' };
    }

    let inLineComment = false;
    let inBlockComment = false;
    let inString = null;
    let isEscaped = false;
    const stack = [];

    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      const next = code[i + 1];

      if (inLineComment) {
        if (ch === '\n' || ch === '\r') {
          inLineComment = false;
        }
        continue;
      }

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (ch === '\\') {
          isEscaped = true;
        } else if (ch === inString) {
          inString = null;
        }
        continue;
      }

      // Check comments
      if (ch === '/' && next === '/') {
        inLineComment = true;
        i++;
        continue;
      }

      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }

      // Check strings
      if (ch === "'" || ch === '"' || ch === '`') {
        inString = ch;
        isEscaped = false;
        continue;
      }

      // Check brackets
      if (ch === '(' || ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === ')') {
        if (stack.length === 0 || stack.pop() !== '(') {
          return { valid: false, message: 'Unmatched closing parenthesis ")"' };
        }
      } else if (ch === '}') {
        if (stack.length === 0 || stack.pop() !== '{') {
          return { valid: false, message: 'Unmatched closing brace "}"' };
        }
      } else if (ch === ']') {
        if (stack.length === 0 || stack.pop() !== '[') {
          return { valid: false, message: 'Unmatched closing bracket "]"' };
        }
      }
    }

    if (inBlockComment) {
      return { valid: false, message: 'Unclosed block comment (/* ... */)' };
    }
    if (inString) {
      return { valid: false, message: `Unclosed string literal (${inString})` };
    }
    if (stack.length > 0) {
      const last = stack[stack.length - 1];
      const name = last === '(' ? 'parenthesis "("' : (last === '{' ? 'brace "{"' : 'bracket "["');
      return { valid: false, message: `Unclosed ${name}` };
    }

    return { valid: true, message: 'Syntax Valid' };
  }

  // Live Metadata & Syntax Inspector
  function inspectMetadataLive() {
    const code = codeTextarea.value || '';
    const meta = UserscriptEngine.parseUserScriptMeta(code);

    metaDisplayName.textContent = meta.name || editorNameInput.value || 'Untitled';
    metaDisplayVersion.textContent = `v${meta.version || '1.0.0'}`;
    editorVersionTag.textContent = `v${meta.version || '1.0.0'}`;
    metaDisplayRunat.textContent = meta.runAt || 'document-idle';

    // Matches
    metaDisplayMatches.innerHTML = '';
    const matches = meta.matches.length > 0 ? meta.matches : ['<all_urls>'];
    matches.forEach(m => {
      const tag = document.createElement('span');
      tag.className = 'meta-tag';
      tag.textContent = m;
      metaDisplayMatches.appendChild(tag);
    });

    // Grants
    metaDisplayGrants.innerHTML = '';
    if (meta.grants.length === 0) {
      metaDisplayGrants.innerHTML = '<span class="meta-tag">none</span>';
    } else {
      meta.grants.forEach(g => {
        const tag = document.createElement('span');
        tag.className = 'meta-tag';
        tag.textContent = g;
        metaDisplayGrants.appendChild(tag);
      });
    }

    // Requires
    metaDisplayRequires.innerHTML = '';
    if (meta.requires.length === 0) {
      metaDisplayRequires.innerHTML = '<span class="meta-tag">none</span>';
    } else {
      meta.requires.forEach(r => {
        const tag = document.createElement('span');
        tag.className = 'meta-tag';
        tag.textContent = r;
        metaDisplayRequires.appendChild(tag);
      });
    }

    // Syntax Check
    const syntaxResult = validateScriptSyntax(code);
    if (syntaxResult.valid) {
      syntaxStatus.className = 'syntax-status valid';
      syntaxStatus.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>Syntax Valid</span>`;
    } else {
      syntaxStatus.className = 'syntax-status invalid';
      syntaxStatus.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>${escapeHtml(syntaxResult.message)}</span>`;
    }
  }

  // Save Script from Editor
  async function saveCurrentEditorScript() {
    const code = codeTextarea.value;
    if (!code.trim()) {
      showToast('Cannot save empty script');
      return;
    }

    const meta = UserscriptEngine.parseUserScriptMeta(code);
    const scriptName = meta.name || editorNameInput.value || 'My Script';

    const scriptObj = {
      id: currentEditingScriptId || UserscriptEngine.generateScriptId(),
      name: scriptName,
      namespace: meta.namespace,
      version: meta.version,
      description: meta.description,
      author: meta.author,
      icon: meta.icon,
      runAt: meta.runAt,
      matches: meta.matches,
      includes: meta.includes,
      excludes: meta.excludes,
      grants: meta.grants,
      requires: meta.requires,
      code: code,
      meta: meta,
      enabled: true
    };

    btnEditorSave.textContent = 'Saving...';
    btnEditorSave.disabled = true;

    try {
      const resp = await api.runtime.sendMessage({ action: 'saveScript', script: scriptObj });
      if (resp && resp.success) {
        currentEditingScriptId = resp.script?.id || resp.scriptId || scriptObj.id;
        editorStatusBadge.textContent = 'Saved';
        showToast(`Saved "${scriptName}" successfully!`);
        await loadData();
      } else {
        showToast(`Save failed: ${resp?.error || 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      btnEditorSave.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>Save (Ctrl+S)</span>`;
      btnEditorSave.disabled = false;
    }
  }

  btnEditorSave.addEventListener('click', saveCurrentEditorScript);

  btnEditorCancel.addEventListener('click', () => {
    switchTab('installed');
  });

  btnEditorDownload.addEventListener('click', () => {
    const code = codeTextarea.value;
    const meta = UserscriptEngine.parseUserScriptMeta(code);
    exportScriptFile({ name: meta.name || 'script', code });
  });

  // Export a script as a downloadable .user.js file (Unicode/Arabic aware)
  function exportScriptFile(script) {
    const safeName = (script.name || 'userscript')
      .trim()
      .replace(/[^\p{L}\p{N}_\-]/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'userscript';
    const filename = `${safeName}.user.js`;
    const blob = new Blob([script.code], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${filename}"`);
  }

  // Tab 3: Install from URL
  btnDashFetchUrl.addEventListener('click', async () => {
    const url = (dashUrlInput.value || '').trim();
    if (!url) {
      showToast('Please enter a script URL');
      return;
    }

    btnDashFetchUrl.textContent = 'Fetching...';
    btnDashFetchUrl.disabled = true;

    try {
      const resp = await api.runtime.sendMessage({ action: 'fetchScriptFromUrl', url });
      if (resp && resp.success && resp.script) {
        fetchedInstallScript = resp.script;
        dashPreviewTitle.textContent = fetchedInstallScript.name;
        dashPreviewAuthor.textContent = `by ${fetchedInstallScript.author || 'Unknown'} • v${fetchedInstallScript.version || '1.0.0'}`;
        dashPreviewDesc.textContent = fetchedInstallScript.description || 'No description';
        dashPreviewMatches.textContent = (fetchedInstallScript.matches || []).join(', ') || '<all_urls>';
        dashUrlPreview.classList.remove('hidden');
        showToast('Script fetched! Ready to install.');
      } else {
        showToast(`Failed: ${resp?.error || 'Could not parse script'}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      btnDashFetchUrl.textContent = 'Fetch & Inspect';
      btnDashFetchUrl.disabled = false;
    }
  });

  btnDashConfirmInstall.addEventListener('click', async () => {
    if (!fetchedInstallScript) return;
    const resp = await api.runtime.sendMessage({ action: 'saveScript', script: fetchedInstallScript });
    if (resp && resp.success) {
      showToast(`Installed "${fetchedInstallScript.name}"!`);
      dashUrlPreview.classList.add('hidden');
      dashUrlInput.value = '';
      fetchedInstallScript = null;
      await loadData();
      switchTab('installed');
    } else {
      showToast('Install failed');
    }
  });

  // Drop Zone File Upload
  dashDropZone.addEventListener('click', () => {
    dashFileInput.click();
  });

  dashDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dashDropZone.classList.add('dragover');
  });

  dashDropZone.addEventListener('dragleave', () => {
    dashDropZone.classList.remove('dragover');
  });

  dashDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dashDropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  });

  dashFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleUploadedFile(e.target.files[0]);
    }
  });

  function handleUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const code = ev.target.result;
        const meta = UserscriptEngine.parseUserScriptMeta(code);
        const scriptObj = {
          id: UserscriptEngine.generateScriptId(),
          name: meta.name || file.name.replace(/\.user\.js$|\.js$/, ''),
          namespace: meta.namespace,
          version: meta.version,
          description: meta.description,
          author: meta.author,
          icon: meta.icon,
          runAt: meta.runAt,
          matches: meta.matches,
          includes: meta.includes,
          excludes: meta.excludes,
          grants: meta.grants,
          requires: meta.requires,
          code: code,
          meta: meta,
          enabled: true,
          sourceUrl: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const resp = await api.runtime.sendMessage({ action: 'saveScript', script: scriptObj });
        if (resp && resp.success) {
          showToast(`Imported "${scriptObj.name}" successfully!`);
          await loadData();
          switchTab('installed');
        } else {
          showToast('Failed to save file');
        }
      } catch (e) {
        showToast('Error reading script file');
      }
      dashFileInput.value = '';
    };
    reader.readAsText(file);
  }

  // Create Template Button
  btnDashCreateTemplate.addEventListener('click', () => {
    openInEditor(null);
  });

  btnCreateNewScript.addEventListener('click', () => {
    openInEditor(null);
  });

  // Check All Updates Action
  btnCheckAllUpdates.addEventListener('click', async () => {
    btnCheckAllUpdates.disabled = true;
    btnCheckAllUpdates.innerHTML = 'Checking...';
    let updatesFound = 0;

    for (const s of allScripts) {
      if (s.meta?.updateURL || s.meta?.downloadURL || s.sourceUrl) {
        try {
          const res = await api.runtime.sendMessage({ action: 'checkScriptUpdate', scriptId: s.id });
          if (res && res.success && res.hasUpdate) {
            updatesFound++;
          }
        } catch (e) {}
      }
    }

    btnCheckAllUpdates.innerHTML = `
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
      </svg>
      <span>Check Updates</span>`;
    btnCheckAllUpdates.disabled = false;

    if (updatesFound > 0) {
      showToast(`${updatesFound} script update(s) available!`);
    } else {
      showToast('All installed scripts are up to date!');
    }
  });

  // Tab 4: Settings Toggles
  settingsMasterToggle.addEventListener('change', async (e) => {
    settings.masterEnabled = e.target.checked;
    await api.storage.local.set({ settings });
    showToast(settings.masterEnabled ? 'Master Engine Enabled' : 'Master Engine Paused');
  });

  settingsBadgeToggle.addEventListener('change', async (e) => {
    settings.showBadgeCount = e.target.checked;
    await api.storage.local.set({ settings });
    showToast('Badge preference updated');
  });

  settingsAutoupdateToggle.addEventListener('change', async (e) => {
    settings.autoCheckUpdates = e.target.checked;
    await api.storage.local.set({ settings });
    showToast('Auto-update preference updated');
  });

  // Export Backup JSON
  btnExportBackup.addEventListener('click', async () => {
    const data = await api.storage.local.get(['scripts', 'settings', 'scriptStorage']);
    const backupObj = {
      app: 'Userscript',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      scripts: data.scripts || [],
      settings: data.settings || {},
      scriptStorage: data.scriptStorage || {}
    };

    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `userscript-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported successfully!');
  });

  // Import Backup JSON (Flexible format: supports both { scripts: [...] } and [...])
  btnImportBackup.addEventListener('click', () => {
    backupFileInput.click();
  });

  backupFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        let importedScripts = [];
        let importedStorage = {};

        if (Array.isArray(parsed)) {
          importedScripts = parsed;
        } else if (parsed && Array.isArray(parsed.scripts)) {
          importedScripts = parsed.scripts;
          importedStorage = parsed.scriptStorage || {};
        } else {
          throw new Error('Invalid backup file format');
        }

        const data = await api.storage.local.get(['scripts', 'scriptStorage']);
        const existingScripts = data.scripts || [];
        const existingStorage = data.scriptStorage || {};

        let importedCount = 0;
        for (const s of importedScripts) {
          if (!s || !s.code) continue;
          const idx = existingScripts.findIndex(ex => ex.id === s.id || (ex.name === s.name && ex.namespace === s.namespace));
          if (idx >= 0) {
            existingScripts[idx] = s;
          } else {
            existingScripts.push(s);
          }
          importedCount++;
        }

        const mergedStorage = { ...existingStorage, ...importedStorage };
        await api.storage.local.set({ scripts: existingScripts, scriptStorage: mergedStorage });

        showToast(`Successfully imported ${importedCount} script(s)!`);
        await loadData();
        switchTab('installed');
      } catch (err) {
        showToast(`Import error: ${err.message}`);
      }
      backupFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Filter & Search events
  if (dashboardSearch) {
    dashboardSearch.addEventListener('input', renderInstalledGrid);
  }
  filterStatus.addEventListener('change', renderInstalledGrid);

  // Parse URL search params (e.g. ?id=script_xxx or ?action=new&match=...)
  function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const scriptId = params.get('id');
    const action = params.get('action');
    const match = params.get('match');
    const name = params.get('name');

    if (scriptId) {
      openInEditor(scriptId);
    } else if (action === 'new' || match || name) {
      openInEditor(null, { name: name || 'Site Tweaks', match: match || '*://*/*' });
    }
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load
  await loadData();
  handleUrlParams();
});
