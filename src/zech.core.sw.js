const SWNETWORK = require('./core/networking/sw_enums')
const StateManager = require('./core/states')

const sha3 = require('js-sha3')

let state = 0x00

let reqStore = {}
let resStoreWorks = {}

self.addEventListener('install', ev => {
  ev.waitUntil(self.skipWaiting())
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

      let hash = sha3.sha3_256(ev.request.url)

      let storedBlocks = {}

      reqStore[hash] = h => {
        requestHTTP()
        delete reqStore[h]

        clearTimeout(fetchTimer)
      }

      resStoreWorks[hash] = (block, num) => {
        resolve(new Response(new Blob([buf])))

        clearTimeout(fetchTimer)
        delete resStoreWorks[hash]
      }

      fetchTimer = setTimeout(() => {
        if (state == StateManager.STATES.DEPEND) {
          throw new reject(`No peers available.`)
        }

        let keys = Object.keys(storedBlocks)
        let keyl = keys.length
        if (keyl) {
          for (var i = 0; i < keyl; i++) {
            let item = keys[i]
          }
        }

        requestHTTP()
      }, 5000)

      client.postMessage({
        cmd: SWNETWORK.RequestFile,
        hash
      })

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
  let d = ev.data
  if (!d) {
    return
  }

  if (d.cmd === SWNETWORK.StateChange) {
    state = d.data
  } else if (d.cmd === SWNETWORK.NoMetadata) {
    reqStore[d.data](d.data)
  } else if (d.cmd === SWNETWORK.DoneFile) {
    resStoreWorks[d.data.url](d.data.block, d.data.num)
  }
})
