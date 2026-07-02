// Lets the hub render inside the new-tab iframe. Self-hosted hubs send
// X-Frame-Options: DENY and CSP frame-ancestors 'none' to prevent clickjacking.
// We remove ONLY those response headers, and ONLY for the sub_frame request to
// the hub host the user configured. The server is left untouched.

const RULE_ID = 1

async function applyRule() {
  const { hubUrl } = await chrome.storage.sync.get('hubUrl')
  const rules = []
  let host = ''
  try { host = hubUrl ? new URL(hubUrl).hostname : '' } catch (_) { host = '' }

  if (host) {
    rules.push({
      id: RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'x-frame-options', operation: 'remove' },
          { header: 'content-security-policy', operation: 'remove' },
          { header: 'content-security-policy-report-only', operation: 'remove' }
        ]
      },
      condition: { urlFilter: `||${host}/`, resourceTypes: ['sub_frame'] }
    })
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
    addRules: rules
  })
}

chrome.runtime.onInstalled.addListener(applyRule)
chrome.runtime.onStartup.addListener(applyRule)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.hubUrl) applyRule()
})
