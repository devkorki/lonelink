function cleanServerUrl(value) { return String(value || '').trim().replace(/\/+$/, ''); }
function nameFromUrl(url, contentType) {
  try {
    const raw = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'image');
    if (/\.[a-z0-9]{2,5}$/i.test(raw)) return raw;
  } catch {}
  const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/avif': '.avif', 'image/svg+xml': '.svg' })[contentType] || '.jpg';
  return `image-${Date.now()}${ext}`;
}
async function setLastUpload(ok, message) {
  await chrome.storage.local.set({ lastUpload: { ok, message, at: Date.now() } });
  await chrome.action.setBadgeBackgroundColor({ color: ok ? '#16a34a' : '#dc2626' });
  await chrome.action.setBadgeText({ text: ok ? '✓' : '!' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 5000);
}
async function uploadImages({ url = '', filePayloads = [] }) {
  const { serverUrl = '' } = await chrome.storage.sync.get('serverUrl');
  const server = cleanServerUrl(serverUrl);
  if (!server) throw new Error('Set your LoneLink address in the extension');
  const form = new FormData();
  if (filePayloads.length) {
    for (const file of filePayloads) {
      const blob = await (await fetch(file.dataUrl)).blob();
      form.append('files', blob, file.name || `image-${Date.now()}`);
    }
  } else if (url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let source;
    try { source = await fetch(url, { signal: controller.signal, credentials: 'include' }); }
    catch (error) {
      if (error.name === 'AbortError') throw new Error('Reading the image timed out');
      throw new Error('The website blocked access to that image');
    } finally { clearTimeout(timer); }
    if (!source.ok) throw new Error(`Could not read image (HTTP ${source.status})`);
    const blob = await source.blob();
    if (!blob.type.startsWith('image/')) throw new Error('The dragged item was a page, not an image');
    form.append('files', blob, nameFromUrl(url, blob.type));
  } else throw new Error('No image was found under the pointer');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let response;
  try { response = await fetch(`${server}/api/upload`, { method: 'POST', body: form, credentials: 'include', signal: controller.signal }); }
  catch (error) {
    if (error.name === 'AbortError') throw new Error('Upload timed out. Check the LoneLink address');
    throw new Error('Could not connect to LoneLink');
  } finally { clearTimeout(timer); }
  if (response.status === 401) throw new Error('Open LoneLink and log in first');
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `LoneLink returned HTTP ${response.status}`);
  }
  return response.json();
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({ id: 'send-image-to-lonelink', title: 'Send image to LoneLink', contexts: ['all'] }));
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'send-image-to-lonelink') return;
  try {
    let url = info.srcUrl || '';
    if (!url && tab?.id != null) {
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'getRememberedImage' }).catch(() => null);
      url = result?.url || '';
    }
    await uploadImages({ url });
    await setLastUpload(true, 'Last upload succeeded');
  } catch (error) { await setLastUpload(false, error?.message || 'Upload failed'); }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'testConnection') {
    (async () => {
      const { serverUrl = '' } = await chrome.storage.sync.get('serverUrl');
      const server = cleanServerUrl(serverUrl);
      if (!server) throw new Error('No LoneLink address configured');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${server}/api/items`, { credentials: 'include', signal: controller.signal });
        if (response.status === 401) throw new Error('LoneLink requires login');
        if (!response.ok) throw new Error(`LoneLink returned HTTP ${response.status}`);
        return { address: server };
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('Connection timed out');
        throw error;
      } finally { clearTimeout(timer); }
    })().then(data => sendResponse({ ok: true, data }), error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'uploadImages') {
    uploadImages(message).then(async data => {
      await setLastUpload(true, 'Last upload succeeded');
      sendResponse({ ok: true, data });
    }, async error => {
      await setLastUpload(false, error?.message || 'Upload failed');
      sendResponse({ ok: false, error: error?.message || 'Upload failed' });
    });
    return true;
  }
});
