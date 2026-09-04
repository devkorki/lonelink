const input = document.querySelector('#server');
const status = document.querySelector('#status');

chrome.storage.sync.get('serverUrl').then(({ serverUrl }) => { input.value = serverUrl || ''; });
document.querySelector('#save').addEventListener('click', async () => {
  let value = input.value.trim().replace(/\/+$/, '');
  if (value && !/^https?:\/\//i.test(value)) value = 'http://' + value;
  await chrome.storage.sync.set({ serverUrl: value });
  input.value = value;
  status.textContent = 'Saved';
  setTimeout(() => { status.textContent = ''; }, 1400);
});
