(() => {
  if (window.top !== window.self) return;
  const panel = document.createElement('div');
  panel.id = 'lonelink-edge-drop';
  panel.innerHTML = '<span>Drop to upload<br>to LoneLink</span>';
  document.documentElement.appendChild(panel);
  let hideTimer;
  let rememberedImageUrl = '';
  let uploadInProgress = false;

  function show() { clearTimeout(hideTimer); panel.classList.add('lonelink-visible'); }
  function hide(delay = 120) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => panel.classList.remove('lonelink-visible', 'lonelink-over'), delay);
  }
  function imageCandidateFromElement(element) {
    if (!(element instanceof Element)) return null;
    const image = element instanceof HTMLImageElement ? element : element.querySelector?.('img');
    if (image) {
      const rect = image.getBoundingClientRect();
      return { url: image.currentSrc || image.src || '', area: Math.max(0, rect.width) * Math.max(0, rect.height) };
    }
    const match = getComputedStyle(element).backgroundImage?.match(/^url\(["']?(.*?)["']?\)$/);
    if (!match?.[1]) return null;
    const rect = element.getBoundingClientRect();
    return { url: match[1], area: Math.max(0, rect.width) * Math.max(0, rect.height) };
  }
  function bestNearbyImage(event) {
    const candidates = [];
    const seen = new Set();
    const add = element => {
      if (!(element instanceof Element) || seen.has(element) || element === panel || panel.contains(element)) return;
      seen.add(element);
      candidates.push(element);
    };
    event.composedPath?.().forEach(add);
    document.elementsFromPoint(event.clientX, event.clientY).forEach(add);
    let ancestor = event.target instanceof Element ? event.target : null;
    for (let depth = 0; ancestor && depth < 6; depth += 1, ancestor = ancestor.parentElement) {
      add(ancestor);
      ancestor.querySelectorAll?.('img').forEach(add);
    }
    const scored = candidates.map(imageCandidateFromElement)
      .filter(item => item?.url && !item.url.startsWith('chrome-extension:'));
    scored.sort((a, b) => b.area - a.area);
    return scored[0]?.url || '';
  }
  function imageUrlFromHtml(html) {
    if (!html) return '';
    const image = new DOMParser().parseFromString(html, 'text/html').querySelector('img');
    if (!image) return '';
    const srcset = image.getAttribute('srcset') || '';
    const largest = srcset.split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean).pop();
    return largest || image.getAttribute('src') || '';
  }
  function imageUrlFromTransfer(dt) {
    if (!dt || typeof dt.getData !== 'function') return '';
    try {
      const htmlUrl = imageUrlFromHtml(dt.getData('text/html'));
      if (htmlUrl) return htmlUrl;
      return (dt.getData('text/uri-list') || '').split(/\r?\n/).find(line => line && !line.startsWith('#')) || '';
    } catch { return ''; }
  }
  function rememberFromEvent(event) {
    const url = bestNearbyImage(event);
    if (url) rememberedImageUrl = url;
    return url;
  }
  function fileToPayload(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener('pointerdown', rememberFromEvent, true);
  document.addEventListener('mousedown', rememberFromEvent, true);
  document.addEventListener('contextmenu', rememberFromEvent, true);
  document.addEventListener('dragstart', event => {
    rememberedImageUrl = imageUrlFromTransfer(event.dataTransfer) || rememberFromEvent(event) || rememberedImageUrl;
    if (rememberedImageUrl || event.dataTransfer?.types?.includes('Files')) show();
  }, true);
  document.addEventListener('dragover', event => { if (event.clientX >= window.innerWidth - 220) show(); }, true);
  document.addEventListener('dragend', () => { if (!uploadInProgress) hide(); }, true);
  document.addEventListener('drop', event => { if (!panel.contains(event.target)) hide(); }, true);
  panel.addEventListener('dragenter', event => { event.preventDefault(); panel.classList.add('lonelink-over'); });
  panel.addEventListener('dragover', event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; });
  panel.addEventListener('dragleave', () => panel.classList.remove('lonelink-over'));
  panel.addEventListener('drop', async event => {
    event.preventDefault();
    event.stopPropagation();
    uploadInProgress = true;
    clearTimeout(hideTimer);
    panel.querySelector('span').textContent = 'Uploading…';
    try {
      const files = Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image/'));
      const filePayloads = await Promise.all(files.map(fileToPayload));
      let url = imageUrlFromTransfer(event.dataTransfer) || rememberedImageUrl;
      if (!filePayloads.length && /^(blob:|data:)/i.test(url)) {
        const blob = await (await fetch(url)).blob();
        const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        filePayloads.push(await fileToPayload(new File([blob], `image-${Date.now()}.${extension}`, { type: blob.type })));
        url = '';
      }
      const response = await chrome.runtime.sendMessage({ type: 'uploadImages', url, filePayloads });
      if (!response?.ok) throw new Error(response?.error || 'Upload failed');
      panel.querySelector('span').textContent = 'Uploaded!';
      rememberedImageUrl = '';
    } catch (error) {
      panel.querySelector('span').textContent = error?.message || 'Upload failed';
    } finally { uploadInProgress = false; }
    hide(3000);
    setTimeout(() => { panel.querySelector('span').innerHTML = 'Drop to upload<br>to LoneLink'; }, 3200);
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getRememberedImage') sendResponse({ url: rememberedImageUrl });
  });
})();
