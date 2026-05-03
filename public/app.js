// app.js — LAN Share frontend logic
(() => {
  const $ = (sel) => document.querySelector(sel);

  const fileList = $('#file-list');
  const textList = $('#text-list');
  const filesEmpty = $('#files-empty');
  const textsEmpty = $('#texts-empty');
  const dropzone = $('#dropzone');
  const fileInput = $('#file-input');
  const textForm = $('#text-form');
  const textInput = $('#text-input');
  const sizeHint = $('#size-hint');
  const progressBox = $('#upload-progress');
  const progressFill = $('#progress-fill');
  const progressText = $('#progress-text');
  const statusEl = $('#status');
  const logoutForm = $('#logout-form');


  const pinsCard = $('#pins-card');
  const pinsList = $('#pins-list');


  let maxUploadBytes = 0;
  let currentFiles = [];
  let currentTexts = [];



  const PINS_STORAGE_KEY = 'lonelink:pins';

  const pinnedItems = new Map(
    JSON.parse(localStorage.getItem(PINS_STORAGE_KEY) || '[]')
  );


  function savePins() {
    localStorage.setItem(
      PINS_STORAGE_KEY,
      JSON.stringify(Array.from(pinnedItems.entries()))
    );
  }

  // ---- Formatting helpers ----
  function fmtBytes(n) {
    if (n == null) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function fmtTime(iso) {
    try { return new Date(iso).toLocaleString(); }
    catch { return iso || ''; }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }




  function linkifyText(text) {
    const escaped = escapeHtml(text);

    return escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  // ---- Data loading ----
  async function refresh() {


    renderFiles(currentFiles);
    renderTexts(currentTexts);
    try {
      const r = await fetch('/api/items');
      if (!r.ok) throw new Error('fetch failed');
      const data = await r.json();
      maxUploadBytes = data.maxUploadBytes || 0;
      sizeHint.textContent = `Max upload size: ${fmtBytes(maxUploadBytes)} per file`;
      if (data.passwordEnabled) logoutForm.hidden = false;


      currentFiles = data.files || [];
      currentTexts = data.texts || [];

      renderFiles(currentFiles);
      renderTexts(currentTexts);

      statusEl.textContent = '';
    } catch {
      statusEl.textContent = 'Connection error';
    }
  }


  // ---- Pin Vector generation ----

  function pinIcon() {
    return `
    <svg class="pin-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 3.5 20.5 9.5 18.8 11.2 16.9 10.7 13.4 14.2 13.8 18.6 12.6 19.8 9.2 16.4 5.2 20.4 3.6 18.8 7.6 14.8 4.2 11.4 5.4 10.2 9.8 10.6 13.3 7.1 12.8 5.2 14.5 3.5Z"/>
    </svg>
  `;
  }




  function isImageFile(name) {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);
  }

  function renderFiles(files) {
    fileList.innerHTML = '';
    filesEmpty.hidden = files.length > 0;


    files.forEach(f => {
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.dragType = 'file';
      li.dataset.dragId = f.name;
      const fileUrl = '/files/' + encodeURIComponent(f.name);
      const safeName = escapeHtml(f.name);

      if (isImageFile(f.name)) {
        li.innerHTML = `
        <div class="image-preview-wrap">
          <img src="${fileUrl}" class="thumb" alt="${safeName}" data-preview="${fileUrl}">
        </div>

        <div class="filename">${safeName}</div>

        <div class="meta">
          <span>${fmtBytes(f.size)}</span>
          <span>${fmtTime(f.uploadedAt)}</span>
        </div>

        <div class="actions">
          <button class="btn ghost pin-btn" data-pin-file="${safeName}" title="Pin item">
  ${pinIcon()}
</button>

          <a class="btn ghost" href="${fileUrl}" download>Download</a>
          <button class="btn danger" data-delete-file="${safeName}">Delete</button>
        </div>
      `;
      } else {
        li.innerHTML = `
        <div class="filename">${safeName}</div>

        <div class="meta">
          <span>${fmtBytes(f.size)}</span>
          <span>${fmtTime(f.uploadedAt)}</span>
        </div>

        <div class="actions">
<button class="btn ghost pin-btn" data-pin-file="${safeName}" title="Pin item">
  ${pinIcon()}
</button>
          <a class="btn ghost" href="${fileUrl}" download>Download</a>
          <button class="btn danger" data-delete-file="${safeName}">Delete</button>
        </div>
      `;
      }

      fileList.appendChild(li);
    });
  }

  function openPreview(src) {
    const modal = document.getElementById('previewModal');
    const img = document.getElementById('previewImg');

    if (!modal || !img) {
      window.open(src, '_blank');
      return;
    }

    img.src = src;
    modal.hidden = false;
  }

  const previewClose = document.querySelector('.close');

  if (previewClose) {
    previewClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closePreview();
    });
  }


  function pinFile(name) {
    const file = currentFiles.find(f => f.name === name);
    if (!file) return;

    pinnedItems.set('file:' + name, {
      type: 'file',
      id: name,
      name: file.name,
      size: file.size,
      uploadedAt: file.uploadedAt
    });
    savePins();

    renderPins();
  }

  function pinText(id) {
    const text = currentTexts.find(t => t.id === id);
    if (!text) return;

    pinnedItems.set('text:' + id, {
      type: 'text',
      id: text.id,
      content: text.content,
      createdAt: text.createdAt
    });
    savePins();

    renderPins();
  }

  function unpinItem(key) {
    pinnedItems.delete(key);
    savePins();

    renderPins();
  }

  function renderPins() {
    pinsList.innerHTML = '';

    pinsCard.hidden = pinnedItems.size === 0;

    const entries = Array.from(pinnedItems.entries()).reverse();

    for (const [key, item] of entries) {
      const li = document.createElement('li');

      if (item.type === 'file') {
        const fileUrl = '/files/' + encodeURIComponent(item.name);
        const safeName = escapeHtml(item.name);
        const isImage = isImageFile(item.name);

        li.innerHTML = `
        ${isImage ? `<img src="${fileUrl}" class="thumb" data-preview="${fileUrl}" alt="${safeName}">` : ''}
        <div class="filename">${safeName}</div>
        <div class="meta">
          <span>${fmtBytes(item.size)}</span>
          <span>${fmtTime(item.uploadedAt)}</span>
        </div>
        <div class="actions">
          <a class="btn ghost" href="${fileUrl}" download>Download</a>
          <button class="btn danger" data-unpin="${escapeHtml(key)}">Unpin</button>
        </div>
      `;
      }

      if (item.type === 'text') {
        li.dataset.content = item.content;
        li.innerHTML = `
        <div class="meta">

        <div class="text-content">${linkifyText(item.content)}</div>
          <span>${fmtTime(item.createdAt)}</span>
        </div>
        <div class="actions">
          <button class="btn ghost" data-copy-pinned="${escapeHtml(key)}">Copy</button>
          <button class="btn danger" data-unpin="${escapeHtml(key)}">Unpin</button>
        </div>
      `;
      }

      pinsList.appendChild(li);
    }
  }



  function renderTexts(texts) {
    textList.innerHTML = '';
    textsEmpty.hidden = texts.length > 0;
    texts.forEach(t => {
      const li = document.createElement('li');

      li.draggable = true;
      li.dataset.dragType = 'text';
      li.dataset.dragId = t.id;
      li.innerHTML = `
        <div class="text-content">${linkifyText(t.content)}</div>
        <div class="meta"><span>${fmtTime(t.createdAt)}</span></div>
        <div class="actions">
<button class="btn ghost pin-btn" data-pin-text="${escapeHtml(t.id)}" title="Pin item">
  ${pinIcon()}
</button>
          <button class="btn ghost" data-copy="${escapeHtml(t.id)}">Copy</button>
          <button class="btn danger" data-delete-text="${escapeHtml(t.id)}">Delete</button>
        </div>
      `;
      // Stash the raw content on the <li> so we don't have to re-escape for copy.
      li.dataset.content = t.content;
      textList.appendChild(li);
    });
  }

  // ---- Delegated click handler for dynamic items ----
  document.addEventListener('click', async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const el = target.closest('button, a, img') || target;

    // Image preview
    if (el.dataset.preview) {
      openPreview(el.dataset.preview);
      return;
    }

    // Pin file
    if (el.dataset.pinFile) {
      pinFile(el.dataset.pinFile);
      return;
    }

    // Pin text
    if (el.dataset.pinText) {
      pinText(el.dataset.pinText);
      return;
    }

    // Unpin
    if (el.dataset.unpin) {
      unpinItem(el.dataset.unpin);
      return;
    }

    // Copy pinned text
    if (el.dataset.copyPinned) {
      const item = pinnedItems.get(el.dataset.copyPinned);
      if (item && item.type === 'text') {
        await copyToClipboard(item.content);
        const original = el.textContent;
        el.textContent = 'Copied!';
        setTimeout(() => { el.textContent = original; }, 1200);
      }
      return;
    }

    // Delete file
    if (el.dataset.deleteFile) {
      if (!confirm('Delete this file?')) return;

      const name = el.dataset.deleteFile;
      const r = await fetch('/api/files/' + encodeURIComponent(name), {
        method: 'DELETE'
      });

      if (r.ok) {
        pinnedItems.delete('file:' + name);
        savePins();
        renderPins();
        refresh();
      } else {
        alert('Failed to delete');
      }

      return;
    }

    // Delete text
    if (el.dataset.deleteText) {
      if (!confirm('Delete this item?')) return;

      const id = el.dataset.deleteText;
      const r = await fetch('/api/text/' + encodeURIComponent(id), {
        method: 'DELETE'
      });

      if (r.ok) {
        pinnedItems.delete('text:' + id);
        savePins();

        renderPins();
        refresh();
      } else {
        alert('Failed to delete');
      }

      return;
    }

    // Copy normal text
    if (el.dataset.copy) {
      const li = el.closest('li');
      const content = li ? li.dataset.content : '';
      const ok = await copyToClipboard(content);
      const original = el.textContent;

      el.textContent = ok ? 'Copied!' : 'Copy failed';
      setTimeout(() => { el.textContent = original; }, 1200);

      return;
    }

    // Open whole text/link card only when not clicking a button/link/image
    const li = target.closest('li');

    if (li && li.dataset.content) {
      if (target.closest('button, a, img')) return;

      const urlMatch = li.dataset.content.match(/https?:\/\/[^\s]+/);

      if (urlMatch) {
        window.open(urlMatch[0], '_blank');
        return;
      }
    }
  });


  const modal = document.getElementById('previewModal');

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePreview();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewImg');

      if (!modal.hidden) {
        modal.hidden = true;
        img.src = '';
      }
    }
  });


  function closePreview() {
    const modal = document.getElementById('previewModal');
    const img = document.getElementById('previewImg');

    if (!modal || !img) return;

    modal.hidden = true;
    img.src = '';
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through */ }
    // Fallback for plain HTTP / older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }

  // ---- Drag & drop ----
  ['dragenter', 'dragover'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag');
    });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) uploadFiles(files);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) uploadFiles(fileInput.files);
    fileInput.value = ''; // reset so picking the same file again still fires change
  });

  // ---- Upload (XHR for progress events) ----
  function uploadFiles(fileListLike) {
    const arr = Array.from(fileListLike);
    if (maxUploadBytes && arr.some(f => f.size > maxUploadBytes)) {
      alert('At least one file exceeds the max upload size of ' + fmtBytes(maxUploadBytes));
      return;
    }
    const fd = new FormData();
    let total = 0;
    arr.forEach(f => { fd.append('files', f); total += f.size; });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = (e.loaded / e.total) * 100;
      progressFill.style.width = pct.toFixed(1) + '%';
      progressText.textContent =
        `${fmtBytes(e.loaded)} / ${fmtBytes(e.total)} (${pct.toFixed(0)}%)`;
    };

    xhr.onload = () => {
      progressBox.hidden = true;
      progressFill.style.width = '0%';
      if (xhr.status >= 200 && xhr.status < 300) {
        refresh();
      } else {
        let msg = 'Upload failed';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch { }
        alert(msg);
      }
    };

    xhr.onerror = () => {
      progressBox.hidden = true;
      alert('Upload error');
    };

    progressBox.hidden = false;
    progressFill.style.width = '0%';
    progressText.textContent = `Uploading ${arr.length} file${arr.length > 1 ? 's' : ''} (${fmtBytes(total)})…`;
    xhr.send(fd);
  }

  // ---- Text form ----
  textForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = textInput.value.trim();
    if (!content) return;
    const r = await fetch('/api/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (r.ok) {
      textInput.value = '';
      refresh();
    } else {
      let msg = 'Failed to share text';
      try { msg = (await r.json()).error || msg; } catch { }
      alert(msg);
    }
  });

  document.addEventListener('paste', (e) => {
    const active = document.activeElement;

    // Do not interfere while typing
    if (active === textInput) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) return;

        uploadFiles([file]);
        e.preventDefault();
        return;
      }
    }
  });


  document.addEventListener('dragstart', (e) => {
    const li = e.target.closest('li');
    if (!li || !li.dataset.dragType || !li.dataset.dragId) return;

    e.dataTransfer.setData('type', li.dataset.dragType);
    e.dataTransfer.setData('id', li.dataset.dragId);
  });

  pinsCard.addEventListener('dragover', (e) => {
    e.preventDefault();
    pinsCard.classList.add('drag');
  });

  pinsCard.addEventListener('dragleave', () => {
    pinsCard.classList.remove('drag');
  });

  pinsCard.addEventListener('drop', (e) => {
    e.preventDefault();
    pinsCard.classList.remove('drag');

    const type = e.dataTransfer.getData('type');
    const id = e.dataTransfer.getData('id');

    if (type === 'file') pinFile(id);
    if (type === 'text') pinText(id);
  });





  // ---- Initial load + light polling so multiple devices stay in sync ----
  renderPins();

  refresh();
  setInterval(refresh, 5000);
})();
