const SWNETWORK = require('./core/networking/sw_enums')
const StateManager = require('./core/states')

let state = 0x00

self.addEventListener('install', ev => {
  self.skipWaiting()
})

self.addEventListener('activate', ev => {
  ev.waitUntil(self.clients.claim())
})

let savedClients = {}

self.addEventListener('fetch', async ev => {
  if (
    ev.request.url.indexOf('/hls/') == -1 ||
    ev.request.url.indexOf('.m3u8') > -1
  )
    return ev

  ev.respondWith(
    new Promise(async (resolve, reject) => {
      let client = await self.clients.get(ev.clientId)
      client.postMessage({
        cmd: SWNETWORK.RequestFile,
        url: ev.request.url
      })

      if (state == StateManager.STATES.ACTIVE) {
        resolve(
          fetch(ev.request.url)
            .then(v => {
              return v.arrayBuffer()
            })
            .then(v => {
              client.postMessage({
                cmd: SWNETWORK.UploadFile,
                url: ev.request.url,
                buf: v
              })

              let res = new Response(v)

              return res
            })
        )
        return
      }

      resolve(
        fetch(ev.request.url, {
          method: 'HEAD'
        }).then(v => {
          if (v.headers.has('content-length')) {
            console.log(v.headers.get('content-length'))
          }
        })
      )
    })
  )
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

  if (ev.data.cmd === SWNETWORK.StateChange) {
    state = ev.data.stateChange
  }
})
