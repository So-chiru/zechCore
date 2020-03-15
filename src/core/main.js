const NETWORKING = require('./networking/enums')

const SignalSocket = require('./networking/signalsocket')
const RTCManager = require('./networking/webrtc')
const log = require('./utils/logs')

let signalClient = new SignalSocket()

signalClient.on('open', async ev => {
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

    log(`Got an offer data from ${data.from_peer}`, data)
  })

  signalClient.on(NETWORKING.answerPeerOffer, data => {
    if (!data.answer || !data.to || !data.from) {
      return false
    }

    let origin = RTCManager.findClient(data.from_peer)
    origin.registerOppositePeer(data.answer_peer)

    origin.setRemoteDescription(data.answer)

    log(`Got an answer data from ${data.answer_peer}`, data)
  })

  signalClient.on(NETWORKING.iceTransport, data => {
    if (!data.candidate || !data.from_peer) {
      return false
    }

    log(`Got a ICE data from opposite peer ${data.from_peer}`, data)

    let origin = RTCManager.findClientOpposite(data.from_peer)
    origin.addIceCandidate(data.candidate)
  })
})
;(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/zechworker.js', {
        scope: '/'
      })
      .then(registration => {
        log(`zechCore ServiceWorker Registered.`)
        console.log(registration)
      })
  }
})()
