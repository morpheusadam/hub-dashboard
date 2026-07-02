const input = document.getElementById('url')
const ok = document.getElementById('ok')

chrome.storage.sync.get('hubUrl', ({ hubUrl }) => { if (hubUrl) input.value = hubUrl })

document.getElementById('save').addEventListener('click', () => {
  let url = input.value.trim()
  if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url
  try { new URL(url) } catch (_) { ok.textContent = 'Please enter a valid URL.'; ok.style.color = '#fb7185'; return }
  chrome.storage.sync.set({ hubUrl: url }, () => {
    ok.textContent = 'Saved. Open a new tab to see your hub.'
    ok.style.color = '#a3e635'
  })
})
