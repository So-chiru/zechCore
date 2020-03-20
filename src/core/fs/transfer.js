const rtc = require('../networking/webrtc')
const NETWORK = require('../networking/enums')

let requestedBlocks = {}

const send = (id, block) => {
  let peer = rtc.find(id)

  if (!peer) {
    throw new Error(`Couldn't find the peer ${id}`)
  }

  peer.send(block)
}

const requestFile = (file) => {
  let blockHashLen = file.blk.length

  for (var i = 0; i < blockHashLen; i++) {
    
  }
}

const rtcHandler = (client, data) => {

}

const signalHandler = (client, data) => {
  if (data[0] === NETWORK.RTCCheckBlock) {
    let block = data.slice(1, data.length )
  }
}

module.exports = {
  send,
  requestFile,
  signalHandler,
  rtcHandler
}