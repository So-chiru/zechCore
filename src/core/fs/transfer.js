const rtc = require('../networking/webrtc')

const send = (id, block) => {
  let peer = rtc.find(id)

  if (!peer) {
    throw new Error(`Couldn't find the peer ${id}`)
  }

  peer.send(block)
}

module.exports = {
  send
}