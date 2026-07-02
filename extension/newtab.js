chrome.storage.sync.get('hubUrl', ({ hubUrl }) => {
  const root = document.getElementById('root')
  if (!hubUrl) {
    root.innerHTML =
      '<div class="msg"><div>' +
      '<h2>Set your hub URL</h2>' +
      '<p>Open the extension options and enter your self-hosted hub address.</p>' +
      '<p><a href="options.html" target="_blank">Open options</a></p>' +
      '</div></div>'
    return
  }
  const frame = document.createElement('iframe')
  frame.src = hubUrl
  frame.allow = 'fullscreen; clipboard-read; clipboard-write'
  root.appendChild(frame)
})
