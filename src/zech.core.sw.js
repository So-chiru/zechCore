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

  let fetchTimer

  ev.respondWith(
    new Promise(async (resolve, reject) => {
      let client = await self.clients.get(ev.clientId)

      let requestHTTP = () => {
        if (fetchTimer) {
          clearTimeout(fetchTimer)
        }

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

        reqStore[hash] = h => {
          requestHTTP()
          delete reqStore[h]
        }

        fetchTimer = setTimeout(() => {
          if (state == StateManager.STATES.DEPEND) {
            throw new reject(`No peers available.`)
          }

          requestHTTP()
        }, 4000)

        client.postMessage({
          cmd: SWNETWORK.RequestFile,
          hash
        })
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
