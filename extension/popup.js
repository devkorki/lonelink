let serverUrl = '';
chrome.storage.sync.get('serverUrl').then(result => {
  serverUrl = result.serverUrl || '';
  document.querySelector('#address').textContent = serverUrl || 'No server configured.';
});
chrome.storage.local.get('lastUpload').then(({ lastUpload }) => {
  if (!lastUpload) return;
  document.querySelector('#last-upload').textContent = `${lastUpload.message} · ${new Date(lastUpload.at).toLocaleTimeString()}`;
});
document.querySelector('#test').addEventListener('click', async () => {
  const result = document.querySelector('#result');
  result.className = 'result';
  result.textContent = 'Testing…';
  const response = await chrome.runtime.sendMessage({ type: 'testConnection' });
  result.textContent = response?.ok ? 'Connected to LoneLink' : (response?.error || 'Connection failed');
  result.classList.add(response?.ok ? 'success' : 'error');
});
document.querySelector('#open').addEventListener('click', () => serverUrl ? chrome.tabs.create({ url: serverUrl }) : chrome.runtime.openOptionsPage());
document.querySelector('#settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
