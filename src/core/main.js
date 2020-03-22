'use strict'

const NETWORKING = require('./networking/enums')

const SignalSocket = require('./networking/signalsocket')
const RTCManager = require('./networking/webrtc')
const StateManager = require('./states')

const file = require('./fs/file')
const transfer = require('./fs/transfer')
const buffer = require('./utils/buffer')

const block = require('./fs/block')
const eventBus = require('./utils/eventBus')

const log = require('./utils/logs')
const sw = require('./serviceworker.js')

const maxClients = 10

let event = new eventBus()

if (DEBUG) {
  log('warn', `Debug mode has been activated. Do not use in production.`)
}

log(`zechCore v${VERSION}.`)

let state = new StateManager.State()
let signalClient = new SignalSocket()
let makeClient = () => {}

signalClient.on('open', async _ => {
  signalClient.uuid = await signalClient.GetUUID()

  log(`Got UUID from the server: ${signalClient.uuid}`)

  makeClient = async toPeer => {
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

    rtcClient.channelEvent.on('data', data => {
      transfer.rtcHandler(rtcClient, data)
    })
  }

  signalClient.on(NETWORKING.createPeerOffer, data => {
    data = buffer.BSONtoObject(data)

    if (!data.offer || !data.to || !data.fi) {
      return false
    }

    let rtcClient = new RTCManager.RTCClient()

    rtcClient.registerOppositePeer(data.fp, data.fi)

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

    rtcClient.channelEvent.on('data', data => {
      transfer.rtcHandler(rtcClient, data)
    })

    log('debug', `Got an offer data from ${data.fp}`, data)
  })

  signalClient.on(NETWORKING.answerPeerOffer, data => {
    data = buffer.BSONtoObject(data)

    if (!data.answer || !data.to || !data.fi) {
      return false
    }

    let origin = RTCManager.find(data.fp)

    origin.registerOppositePeer(data.answer_peer, data.fi)

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

  signalClient.on(NETWORKING.NoMetadata, data => {
    data = buffer.hexStringConvert(data)

    sw.workerEvent.emit('sendMessage', sw.SWNETWORK.NoMetadata, data)
  })

  signalClient.on(NETWORKING.SendMetadata, data => {
    data = buffer.BSONtoObject(data)

    let hashFile = new file.File(data.h, data.urlh)
    hashFile.addHash(data.h, data.blk)
    hashFile.onBlock = (block, num, hashes) => {
      sw.workerEvent.emit('sendMessage', sw.SWNETWORK.SendBlock, {
        url: data.urlh,
        block,
        num,
        hashes
      })
    }

    if (!data.peers.length) {
      sw.workerEvent.emit('sendMessage', sw.SWNETWORK.NoMetadata, data.urlh)
      return
    }

    if (RTCManager.clientsConnected().length < maxClients) {
      let peers = data.peers

      for (var i = 0; i < peers.length; i++) {
        if (RTCManager.findOppositeSignal(peers[i])) continue

        makeClient(peers[i])
      }
    }

    transfer.requestFile(data)
  })
})

sw.workerEvent.emit(
  'sendMessage',
  sw.SWNETWORK.StateChange,
  StateManager.STATES.ACTIVE
)

sw.workerEvent.on('sendMessage', (cmd, data) => {
  if (cmd === sw.SWNETWORK.StateChange) {
    document.querySelector('#zechstrategy' + data).checked = true
  }
})

state.stateEvent.on('change', v => {
  sw.workerEvent.emit('sendMessage', sw.SWNETWORK.StateChange, v)
})

sw.workerEvent.on('message', async data => {
  if (data.cmd == sw.SWNETWORK.RequestFile) {
    if (!signalClient.connected()) {
      sw.workerEvent.emit('sendMessage', sw.SWNETWORK.NoMetadata, data.hash)

      return
    }

    signalClient.requestMetadata(data.hash, state.state)
  } else if (data.cmd == sw.SWNETWORK.UploadFile) {
    let swFile = new file.File(data.buf, block.hash(data.url))
    signalClient.uploadMetadata(data.url, swFile.hash, swFile.blockHashes)

    setTimeout(() => {
      swFile.remove()
    }, 60000)
  } else if (data.cmd === sw.SWNETWORK.BlockDone) {
    signalClient.notifyBlockDone(data.hash)
  }

  data = undefined
})

setInterval(() => {
  document.querySelector('#zechcls').innerHTML = RTCManager.clients().length
  document.querySelector(
    '#zechcccls'
  ).innerHTML = RTCManager.clientsConnected().length
}, 500)

window.zechCore = {
  signalClient,
  maxClients,
  state,
  event
}
