const rtc = require('../networking/webrtc')
const File = require('./file')
const Block = require('./block')

const NETWORKING = require('../networking/enums')

const buffer = require('../utils/buffer')

const sw = require('../serviceworker')

let nameStorage = {}
let fileTickStore = {}

let requestSentBlocks = {}
let requestDoneBlocks = {}
let requestDone = {}
let IdSentClients = {}
let requestSentClients = {}
let coolDown = {}

const send = (id, block) => {
  let peer = rtc.find(id)

  if (!peer) {
    throw new Error(`Couldn't find the peer ${id}`)
  }

  peer.send(block)
}

const fileTick = (fd, id, idstr, buf) => {
  let clis = rtc.clientsConnected()
  let uid = fd.urlh + idstr

  let blocksWait = [
    ...Array.from(Array(fd.blk.length).keys()).filter(v => {
      return (
        !requestDone[idstr] &&
        !requestDoneBlocks[idstr + v] &&
        !requestSentBlocks[idstr + v]
      )
    })
  ]

  for (let i = blocksWait.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[blocksWait[i], blocksWait[j]] = [blocksWait[j], blocksWait[i]]
  }

  let clis_len = clis.length

  for (var i = 0; i < clis_len; i++) {
    if (!blocksWait.length) {
      return
    }

    let cli = clis[i]

    nameStorage[cli.id + idstr] = fd.urlh

    if (!IdSentClients[uid]) {
      cli.send(NETWORKING.RTCAssignShortID, buf)

      IdSentClients[uid] = true
    }

    if (requestSentClients[uid]) {
      continue
    }

    if (
      coolDown[cli.id + idstr + blocksWait[blocksWait.length - 1]] > Date.now()
    ) {
      continue
    }

    coolDown[cli.id + idstr + blocksWait[blocksWait.length - 1]] =
      Date.now() + 50

    let toSent = blocksWait.pop()
    let blockNum = buffer.numberBufferConvert(toSent, 2)

    let cc = buffer.concatBuffer(id, blockNum)

    cli.send(NETWORKING.RTCCheckBlock, cc)
    requestSentBlocks[idstr + toSent] = true

    continue
  }
}

let lastRequest = 0
const requestFile = fd => {
  if (fileTickStore[fd.urlh]) {
    return
  }

  if (lastRequest + 10 > Date.now()) {
    throw new Error('Too fast request. slow down.')
  }

  let id = buffer.randomBytes(4)
  let urlHex = buffer.stringHexConvert(fd.urlh)
  let buf = buffer.concatBuffer(id, urlHex)

  fileTickStore[fd.urlh] = setInterval(() => {
    fileTick(fd, id, buffer.hexStringConvert(new Uint8Array(id)), buf)
  }, 10)
}

sw.workerEvent.on('message', data => {
  if (data && data.cmd === sw.SWNETWORK.DoneFile && fileTickStore[data.hash]) {
    clearInterval(fileTickStore[data.hash])
  }
})

const rtcHandler = (client, data) => {
  if (data[0] === NETWORKING.RTCAssignShortID) {
    let id = buffer.hexStringConvert(data.slice(1, 5))
    let urlHash = buffer.hexStringConvert(data.slice(5, 37))

    nameStorage[client.id + id] = urlHash
  }

  if (data[0] === NETWORKING.RTCCheckBlock) {
    let sl = data.slice(1, 5)
    let bnsl = data.slice(5, 8)

    let id = nameStorage[client.id + buffer.hexStringConvert(sl)]
    let blockNum = buffer.bufferNumberConvert(bnsl)

    let file = File.get(id)

    if (!file || !file.getBlock(blockNum)) {
      return client.send(NETWORKING.RTCResponseNoBlock, sl)
    }

    let buf = file.getBlock(blockNum).buffer

    let cc = buffer.concatBuffer(data.slice(1, 8), buf)
    client.send(NETWORKING.RTCAnswerBlock, cc)
    return
  } else if (data[0] === NETWORKING.RTCResponseNoBlock) {
    let id = buffer.hexStringConvert(data.slice(1, 5))
    let blockNum = buffer.bufferNumberConvert(data.slice(5, 7))

    requestSentClients[id + blockNum]--
    requestSentBlocks[id + blockNum] = false
  } else if (data[0] === NETWORKING.RTCAnswerBlock) {
    let id = nameStorage[client.id + buffer.hexStringConvert(data.slice(1, 5))]
    let blockNum = buffer.bufferNumberConvert(data.slice(5, 7))
    let block = data.slice(7, data.byteLength)

    let file = File.get(id)

    if (!file || !block) {
      return
    }

    let fb = new Block.Block(block.byteLength)
    fb.buffer = block
    file.addBlock(fb, blockNum, () => {
      requestDone[id] = true
    })

    requestDoneBlocks[id + blockNum] = true
    delete requestSentBlocks[id + blockNum]
  }
}

const signalHandler = (client, data) => {
  if (data[0] === NETWORKING.RTCCheckBlock) {
    let block = data.slice(1, data.length)
  }
}

module.exports = {
  send,
  requestFile,
  signalHandler,
  rtcHandler
}
