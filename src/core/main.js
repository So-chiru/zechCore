const NETWORKING = require('./networking/enums')

const SignalSocket = require('./networking/signalsocket')
const RTCManager = require('./networking/webrtc')
const StateManager = require('./states')

const block = require('./fs/block')
const buffer = require('./utils/buffer')

const log = require('./utils/logs')
const sw = require('./serviceworker.js')

if (DEBUG) {
  log('warn', `Debug mode has been activated. Do not use in production.`)
}

log(`zechCore v${VERSION}.`)

let state = new StateManager.State()
let signalClient = new SignalSocket()

signalClient.on('open', async _ => {
  signalClient.uuid = await signalClient.GetUUID()

  log(`Got UUID from the server: ${signalClient.uuid}`)

  signalClient.GetPeerLists(
    {
      size: 10
    },
    async data => {
      // FIXME : Test code
      let toPeer = data[0]

      if (!toPeer) return

      let rtcClient = new RTCManager.RTCClient()
      let offerText = await rtcClient.createOffer()
      signalClient.sendOffer(offerText, toPeer, rtcClient.id)

      rtcClient.events.on('ice', iceData => {
        signalClient.sendICE(iceData, toPeer, rtcClient.id)
      })

      rtcClient.channelEvent.on('open', () => {
        log(`Peer ${rtcClient.oppositeId} connected.`)
      })

      rtcClient.channelEvent.on('close', () => {
        log(`Peer ${rtcClient.oppositeId} closed.`)
      })
    }
  )

  signalClient.on(NETWORKING.createPeerOffer, data => {
    data = buffer.BSONtoObject(data)

    if (!data.offer || !data.to || !data.fi) {
      return false
    }

    let rtcClient = new RTCManager.RTCClient()
    rtcClient.registerOppositePeer(data.fp)

    rtcClient.setRemoteDescription(data.offer).then(async () => {
      let answerText = await rtcClient.createAnswer()
      signalClient.sendAnswer(answerText, data.fi, data.fp, rtcClient.id)
    })

    rtcClient.events.on('ice', iceData => {
      signalClient.sendICE(iceData, data.fi, rtcClient.id)
    })

    rtcClient.channelEvent.on('open', () => {
      log(`Peer ${rtcClient.oppositeId} connected.`)
    })

    rtcClient.channelEvent.on('close', () => {
      log(`Peer ${rtcClient.oppositeId} closed.`)
    })

    log('debug', `Got an offer data from ${data.fp}`, data)
  })

  signalClient.on(NETWORKING.answerPeerOffer, data => {
    data = buffer.BSONtoObject(data)

    if (!data.answer || !data.to || !data.fi) {
      return false
    }

    let origin = RTCManager.find(data.fp)
    origin.registerOppositePeer(data.answer_peer)

    origin.setRemoteDescription(data.answer)

    log('debug', `Got an answer data from ${data.answer_peer}`, data)
  })

  signalClient.on(NETWORKING.iceTransport, data => {
    data = buffer.BSONtoObject(data)

    if (!data.c || !data.fp) {
      return false
    }

    log('debug', `Got a ICE data from opposite peer ${data.fp}`, data)

    let origin = RTCManager.findOpposite(data.fp)
    origin.addIceCandidate(data.c)
  })

  signalClient.on(NETWORKING.NoMetadata, () => {
    // TODO : No metadata, then fetch from streaming server and report to the signal server.
  })
})

state.stateEvent.on('change', v => {
  sw.workerEvent.emit('sendMessage', { stateChange: v })
})

sw.workerEvent.on('message', data => {
  if (data.cmd == sw.SWNETWORK.RequestFile) {
    signalClient.requestMetadata(block.hash(data.url))
  }
})
;(() => {
  setInterval(() => {
    document.querySelector(
      '.zech-clients'
    ).innerHTML = RTCManager.clients().length

    document.querySelector(
      '.zech-clients-connected'
    ).innerHTML = RTCManager.clientsConnected().length
  }, 1000)
})()

window.zechCore = {
  signalClient
}
