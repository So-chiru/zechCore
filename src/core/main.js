const NETWORKING = require('./networking/enums')

const SignalSocket = require('./networking/signalsocket')
const RTCManager = require('./networking/webrtc')
const log = require('./utils/logs')

if (DEBUG) {
  log('warn', `Debug mode has been activated. Do not use in production.`)
}

log(`zechCore v${VERSION}.`)

let signalClient = new SignalSocket()

signalClient.on('open', async _ => {
  signalClient.uuid = await signalClient.GetUUID()

  log(`Got UUID from the server: ${signalClient.uuid}`)

  signalClient.GetPeerLists(
    {
      size: 10
    },
    async data => {
      console.log(data)

      // FIXME : Test code
      let toPeer = data[0]

      signalClient.requestMetadata('10f70afe44089b7e7ff5b7477da0f5e0d46e5de558a30b8e6a78226f42600b3d')

      if (!toPeer) return

      let rtcClient = new RTCManager.RTCClient()
      let offerText = await rtcClient.createOffer()
      signalClient.sendOffer(offerText, toPeer, rtcClient.id)

      rtcClient.events.on('ice', iceData => {
        signalClient.sendICE(iceData, toPeer, rtcClient.id)
      })
    }
  )

  signalClient.on(NETWORKING.createPeerOffer, data => {
    if (!data.offer || !data.to || !data.from) {
      return false
    }

    let rtcClient = new RTCManager.RTCClient()
    rtcClient.registerOppositePeer(data.from_peer)

    rtcClient.setRemoteDescription(data.offer).then(async () => {
      let answerText = await rtcClient.createAnswer()
      signalClient.sendAnswer(
        answerText,
        data.from,
        data.from_peer,
        rtcClient.id
      )
    })

    rtcClient.events.on('ice', iceData => {
      signalClient.sendICE(iceData, data.from, rtcClient.id)
    })

    log('debug', `Got an offer data from ${data.from_peer}`, data)
  })

  signalClient.on(NETWORKING.answerPeerOffer, data => {
    if (!data.answer || !data.to || !data.from) {
      return false
    }

    let origin = RTCManager.find(data.from_peer)
    origin.registerOppositePeer(data.answer_peer)

    origin.setRemoteDescription(data.answer)

    log('debug', `Got an answer data from ${data.answer_peer}`, data)
  })

  signalClient.on(NETWORKING.iceTransport, data => {
    if (!data.candidate || !data.from_peer) {
      return false
    }

    log('debug', `Got a ICE data from opposite peer ${data.from_peer}`, data)

    let origin = RTCManager.findOpposite(data.from_peer)
    origin.addIceCandidate(data.candidate)
  })

  signalClient.on('open', () => {
    log(`Peer ${this.oppositeId} connected.`)
  })
})
  
;(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/zechworker.js', {
      })
      .then(registration => {
        log('debug', `zechCore ServiceWorker Registered.`)
        console.log(registration)
      })
  }

  setInterval(() => {
    document.querySelector(
      '.zech-clients'
    ).innerHTML = RTCManager.clients().length
  }, 1000)
})()

window.zechCore = {
  signalClient
}