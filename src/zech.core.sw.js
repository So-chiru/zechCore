const SWNETWORK = require('./core/networking/sw_enums')

self.addEventListener('install', ev => {
  self.skipWaiting()
})

self.addEventListener('activate', ev => {
  ev.waitUntil(self.clients.claim())
})

let savedClients = {}

self.addEventListener('fetch', async ev => {
  if (ev.request.url.indexOf('zech_core') == -1) return false

  let client = await self.clients.get(ev.clientId)
  client.postMessage({
    cmd: SWNETWORK.RequestFile,
    url: ev.request.url
  })

  return ev
})

self.addEventListener('message', ev => {
  if (!ev.data) {
    return
  }

  if (!savedClients[ev.source.id]) {
    savedClients[ev.source.id] = {
      last: Date.now()
    }
  }

  savedClients[ev.source.id].last = Date.now()
})