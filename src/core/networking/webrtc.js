let clientLists = []

const uuid = require('../utils/uuid')
const eventBus = require('../utils/eventBus')

class RTCClient {
  constructor () {
    this.createClient()
    this.createDataChannel('default')

    this.events = new eventBus()
    clientLists.push(this)
  }

  createClient () {
    this.client = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })
    this.id = uuid()
    this.oppositeId = null

    this.client.onicecandidate = ev => {
      if (ev.candidate) {
        this.events.emit('ice', ev.candidate)
      }
    }
  }

  addIceCandidate (candidate) {
    this.client.addIceCandidate(new RTCIceCandidate(candidate))
  }

  registerOppositePeer (id) {
    this.oppositeId = id
  }

  createDataChannel (name) {
    let channel = this.client.createDataChannel(name)

    channel.onopen = (ev) => {
      console.log('OPENNED!!!! OPEENED! GUYS!!!')
    }
  }

  createOffer () {
    return new Promise(async (resolve, reject) => {
      let offer = await this.client.createOffer()
      await this.client.setLocalDescription(offer)

      resolve(offer)
    })
  }

  createAnswer () {
    return new Promise(async (resolve, reject) => {
      let answer = await this.client.createAnswer()
      await this.client.setLocalDescription(answer)

      resolve(answer)
    })
  }

  setRemoteDescription (sdp) {
    return new Promise((resolve, reject) => {
      this.client.setRemoteDescription(
        new RTCSessionDescription(sdp),
        resolve,
        reject
      )
    })
  }
}

const findClient = id => {
  let len = clientLists.length

  for (var i = 0; i < len; i++) {
    let client = clientLists[i]

    if (client.id === id) return client
  }

  return null
}

const findClientOpposite = id => {
  let len = clientLists.length

  for (var i = 0; i < len; i++) {
    let client = clientLists[i]

    if (client.oppositeId === id) return client
  }

  return null
}

module.exports = {
  RTCClient,
  findClient,
  findClientOpposite
}
