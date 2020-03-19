const SWNETWORK = require('./core/networking/sw_enums')
const StateManager = require('./core/states')

const sha3 = require('js-sha3')

let state = 0x00

let reqStore = {}

self.addEventListener('install', ev => {
  self.skipWaiting()
})

self.addEventListener('activate', ev => {
  ev.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', async ev => {
  if (
    ev.request.url.indexOf('/hls/') == -1 ||
    ev.request.url.indexOf('.m3u8') > -1
  )
    return ev

  ev.respondWith(
    new Promise(async (resolve, reject) => {
      let client = await self.clients.get(ev.clientId)

      console.log(state)

      let requestHTTP = () => {
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

              return new Response(v)
            })
        )
      }

      if (state == StateManager.STATES.ACTIVE) {
        requestHTTP()

        return
      } else if (
        state == StateManager.STATES.COOP ||
        state == StateManager.STATES.DEPEND
      ) {
        let hash = sha3.sha3_256(ev.request.url)

        client.postMessage({
          cmd: SWNETWORK.RequestFile,
          url: hash
        })

        reqStore[hash] = {
          once: false,
          fn: hash => {
            if (reqStore[hash].once) {
              requestHTTP()
              delete reqStore[hash]
            }

            client.postMessage({
              cmd: SWNETWORK.SubscribePeerWait,
              url: hash
            })

            reqStore[hash].once = true
          }
        }
      }

      // resolve(
      //   fetch(ev.request.url, {
      //     method: 'HEAD'
      //   }).then(v => {
      //     if (v.headers.has('content-length')) {
      //       console.log(v.headers.get('content-length'))
      //     }
      //   })
      // )
    })
  )
})

self.addEventListener('message', ev => {
  if (!ev.data) {
    return
  }

  if (ev.data.cmd === SWNETWORK.StateChange) {
    state = ev.data.data
  } else if (ev.data.cmd === SWNETWORK.NoMetadata) {
    reqStore[ev.data.data](ev.data.data)
  }
})
