/**
 * Userscript - Popup Controller (Firefox)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const api = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  if (!api) return;

  // DOM Elements
  const masterToggle = document.getElementById('master-toggle');
  const masterStatusText = document.getElementById('master-status-text');
  const btnOpenDashboard = document.getElementById('btn-open-dashboard');
  const btnToggleUrlBox = document.getElementById('btn-toggle-url-box');
  const btnCloseUrlBox = document.getElementById('btn-close-url-box');
  const btnUploadFile = document.getElementById('btn-upload-file');
  const fileInput = document.getElementById('file-input');
  const btnNewScript = document.getElementById('btn-new-script');

  const urlInstallSection = document.getElementById('url-install-section');
  const scriptUrlInput = document.getElementById('script-url-input');
  const btnFetchUrl = document.getElementById('btn-fetch-url');
  const urlPreviewCard = document.getElementById('url-preview-card');
  const previewName = document.getElementById('preview-name');
  const previewVersion = document.getElementById('preview-version');
  const previewDesc = document.getElementById('preview-desc');
  const previewMatches = document.getElementById('preview-matches');
  const btnConfirmInstallUrl = document.getElementById('btn-confirm-install-url');

  const installedCount = document.getElementById('installed-count');
  const allScriptsList = document.getElementById('all-scripts-list');
  const toast = document.getElementById('toast');

  let currentTabUrl = '';
  let currentTabHost = '';
  let allScripts = [];
  let currentFetchedScript = null;

  // Helper: Show Toast
  function showToast(text, duration = 2000) {
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Get active tab URL
  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      currentTabUrl = tabs[0].url;
      try {
        const urlObj = new URL(currentTabUrl);
        currentTabHost = urlObj.hostname;
      } catch (e) {
        currentTabHost = '';
      }
    }
  } catch (e) {
    // Ignore
  }

  // Load state and render
  async function loadAndRender() {
    const data = await api.storage.local.get(['scripts', 'settings']);
    const masterEnabled = data.settings?.masterEnabled !== false;
    allScripts = (data.scripts || []).filter(s => !s.name || !s.name.startsWith('Welcome to Userscript'));
    if (data.scripts && data.scripts.length !== allScripts.length) {
      await api.storage.local.set({ scripts: allScripts });
    }

    // Master switch
    masterToggle.checked = masterEnabled;
    if (masterEnabled) {
      masterStatusText.textContent = 'Active';
      masterStatusText.classList.remove('disabled');
    } else {
      masterStatusText.textContent = 'Paused';
      masterStatusText.classList.add('disabled');
    }

    // Installed count
    installedCount.textContent = allScripts.length;
    renderAllScripts();
  }

  // Render all installed scripts
  function renderAllScripts() {
    allScriptsList.innerHTML = '';

    if (allScripts.length === 0) {
      allScriptsList.innerHTML = '<div class="empty-state">No scripts installed.</div>';
      return;
    }

    allScripts.forEach(script => {
      const item = createScriptElement(script);
      allScriptsList.appendChild(item);
    });
  }

  // Create script list item DOM element
  function createScriptElement(script) {
    const el = document.createElement('div');
    el.className = `script-item ${script.enabled !== false ? 'enabled' : ''}`;
    el.dataset.id = script.id;

    el.innerHTML = `
      <div class="script-item-main">
        <div class="script-meta-info">
          <div class="script-name-row">
            <span class="script-name" title="${escapeHtml(script.name)}">${escapeHtml(script.name)}</span>
            <span class="script-ver">v${escapeHtml(script.version || '1.0')}</span>
          </div>
          <div class="script-desc">${escapeHtml(script.description || 'No description')}</div>
        </div>
      </div>
      <div class="script-actions">
        <button class="icon-btn edit-btn" title="Edit in Dashboard">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="icon-btn danger delete-btn" title="Delete Script">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        <label class="mini-switch" title="Enable/Disable script">
          <input type="checkbox" class="script-toggle" ${script.enabled !== false ? 'checked' : ''}>
          <span class="mini-slider"></span>
        </label>
      </div>
    `;

    // Toggle event
    const toggleInput = el.querySelector('.script-toggle');
    toggleInput.addEventListener('change', async (e) => {
      const isEnabled = e.target.checked;
      await api.runtime.sendMessage({
        action: 'toggleScript',
        scriptId: script.id,
        enabled: isEnabled
      });
      script.enabled = isEnabled;
      el.classList.toggle('enabled', isEnabled);
      showToast(isEnabled ? `"${script.name}" enabled` : `"${script.name}" disabled`);
      loadAndRender();
    });

    // Edit button event
    const editBtn = el.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => {
      api.runtime.sendMessage({ action: 'openEditor', scriptId: script.id });
      window.close();
    });

    // Delete button event
    const deleteBtn = el.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete "${script.name}"?`)) {
        await api.runtime.sendMessage({ action: 'deleteScript', scriptId: script.id });
        showToast('Script deleted');
        loadAndRender();
      }
    });

    return el;
  }

  // Master Switch Event
  masterToggle.addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;
    const data = await api.storage.local.get(['settings']);
    const settings = data.settings || {};
    settings.masterEnabled = isEnabled;
    await api.storage.local.set({ settings });

    showToast(isEnabled ? 'Engine Active' : 'Engine Paused');
    loadAndRender();
  });

  // Open Dashboard button
  btnOpenDashboard.addEventListener('click', () => {
    api.runtime.sendMessage({ action: 'openEditor' });
    window.close();
  });

  // Create New Script button
  btnNewScript.addEventListener('click', () => {
    const scriptName = currentTabHost ? `${currentTabHost} Tweaks` : 'My New Script';
    api.runtime.sendMessage({
      action: 'openEditor',
      urlToMatch: currentTabHost ? `*://${currentTabHost}/*` : '*://*/*',
      name: scriptName
    });
    window.close();
  });

  // Toggle URL Install Box
  btnToggleUrlBox.addEventListener('click', () => {
    urlInstallSection.classList.toggle('hidden');
    if (!urlInstallSection.classList.contains('hidden')) {
      scriptUrlInput.focus();
    }
  });

  btnCloseUrlBox.addEventListener('click', () => {
    urlInstallSection.classList.add('hidden');
    urlPreviewCard.classList.add('hidden');
    currentFetchedScript = null;
  });

  // Fetch URL button
  btnFetchUrl.addEventListener('click', async () => {
    const url = (scriptUrlInput.value || '').trim();
    if (!url) {
      showToast('Please enter a valid URL');
      return;
    }

    btnFetchUrl.textContent = 'Fetching...';
    btnFetchUrl.disabled = true;

    try {
      const resp = await api.runtime.sendMessage({ action: 'fetchScriptFromUrl', url });
      if (resp && resp.success && resp.script) {
        currentFetchedScript = resp.script;
        previewName.textContent = currentFetchedScript.name;
        previewVersion.textContent = `v${currentFetchedScript.version || '1.0.0'}`;
        previewDesc.textContent = currentFetchedScript.description || 'No description';
        previewMatches.textContent = (currentFetchedScript.matches || []).join(', ') || '<all_urls>';
        urlPreviewCard.classList.remove('hidden');
        showToast('Script fetched! Click install to save.');
      } else {
        showToast(`Failed: ${resp?.error || 'Could not parse script'}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      btnFetchUrl.textContent = 'Fetch';
      btnFetchUrl.disabled = false;
    }
  });

  // Confirm Install URL
  btnConfirmInstallUrl.addEventListener('click', async () => {
    if (!currentFetchedScript) return;
    btnConfirmInstallUrl.textContent = 'Installing...';
    btnConfirmInstallUrl.disabled = true;

    const resp = await api.runtime.sendMessage({ action: 'saveScript', script: currentFetchedScript });
    if (resp && resp.success) {
      showToast(`"${currentFetchedScript.name}" installed!`);
      urlInstallSection.classList.add('hidden');
      urlPreviewCard.classList.add('hidden');
      scriptUrlInput.value = '';
      currentFetchedScript = null;
      loadAndRender();
    } else {
      showToast(`Failed: ${resp?.error || 'Save error'}`);
    }
    btnConfirmInstallUrl.textContent = 'Confirm & Install';
    btnConfirmInstallUrl.disabled = false;
  });

  // Upload File button
  btnUploadFile.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const code = event.target.result;
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
          showToast(`Imported: "${scriptObj.name}"`);
          loadAndRender();
        } else {
          showToast('Failed to save imported script');
        }
      } catch (err) {
        showToast('Error reading file');
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Helper: Escape HTML
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
  loadAndRender();
});
