const SWNETWORK = require('./core/networking/sw_enums')
const StateManager = require('./core/states')

const sha3 = require('js-sha3')
const { concatBuffer } = require('./core/utils/buffer')

const noEmpty = a => {
  let l = a.length

  for (var i = 0; i < l; i++) {
    if (!a[i]) return false
  }

  return true
}

let state = 0x00

self.addEventListener('install', ev => {
  ev.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', ev => {
  ev.waitUntil(self.clients.claim())
})

const requestHTTP = (url, hash, client) =>
  fetch(url)
    .then(v => {
      return v.arrayBuffer()
    })
    .then(v => {
      client.postMessage({
        cmd: SWNETWORK.UploadFile,
        url: url,
        buf: v
      })

      return new Response(v)
    })

const sendCommand = (cli, cmd, data) =>
  cli.postMessage({
    cmd,
    ...data
  })

let requestStorage = {}

self.addEventListener('fetch', async ev => {
  if (
    ev.request.url.indexOf('/hls/') == -1 ||
    ev.request.url.indexOf('.m3u8') > -1
  )
    return ev

  let hash = sha3.sha3_256(ev.request.url)

  ev.respondWith(
    new Promise(async (resolve, reject) => {
      let client = await self.clients.get(ev.clientId)

      requestStorage[hash] = {
        done: false,
        gofetch: () => {
          if (this.blocks) {
            console.log(this.blocks)
          }

          resolve(requestHTTP(ev.request.url, hash, client))
        },
        blocks: [],
        onblock: (block, num, hashes) => {
          requestStorage[hash].blocks[num] = block

          if (
            hashes.length === requestStorage[hash].blocks.length &&
            noEmpty(requestStorage[hash].blocks)
          ) {
            requestStorage[hash].blockdone()
          }
        },
        throwError: reason => {
          reject({ status: 500, statusText: reason })
        },
        blockdone: () => {
          let buf = concatBuffer(
            ...requestStorage[hash].blocks.map(v => v._buf)
          )

          resolve(new Response(buf))

          sendCommand(client, SWNETWORK.BlockDone, { hash })

          requestStorage[hash].done = true
        },
        timeout: setTimeout(
          () =>
            requestStorage[hash] &&
            (!requestStorage[hash].done && state === StateManager.STATES.DEPEND
              ? requestStorage[hash].throwError('No Peers')
              : requestStorage[hash] &&
                !requestStorage[hash].done &&
                requestStorage[hash].gofetch()),
          4000
        )
      }

      sendCommand(client, SWNETWORK.RequestFile, { hash })
    })
      .finally(() => {
        if (requestStorage[hash].timeout) {
          clearTimeout(requestStorage[hash].timeout)
        }

        delete requestStorage[hash]
      })
      .then(async v => {
        let client = await self.clients.get(ev.clientId)
        sendCommand(client, SWNETWORK.DoneFile, { hash })

        return v
      })
      .catch(res => {
        return new Response(null, res)
      })
  )
})

self.addEventListener('message', ev => {
  let d = ev.data
  if (!d) {
    return
  }

  switch (d.cmd) {
    case SWNETWORK.StateChange:
      state = d.data
      break
    case SWNETWORK.NoMetadata:
      state === StateManager.STATES.DEPEND
        ? requestStorage[d.data].throwError('No Peers')
        : requestStorage[d.data] && requestStorage[d.data].gofetch(d.data)
      break
    case SWNETWORK.SendBlock:
      requestStorage[d.data.url].onblock(
        d.data.block,
        d.data.num,
        d.data.hashes
      )
      break
    default:
      console.log('unhandled log message: ' + d.cmd)
  }
})
