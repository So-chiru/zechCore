let clientLists = []

const NETWORKING = require('./enums')
const uuid = require('../utils/uuid')
const log = require('../utils/logs')
const buffer = require('../utils/buffer')
const eventBus = require('../utils/eventBus')

const block = require('../fs/block')
class RTCClient {
  constructor () {
    this.createClient()
    this.createDataChannel('default')

    this.events = new eventBus()
    this.channelEvent = new eventBus()

    this.__lastPing = Date.now()
    this.latency = 0

    this.addChannelEventListener()

    clientLists.push(this)
  }

  createClient () {
    this.client = new (RTCPeerConnection || webkitRTCPeerConnection)({
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
    let channel = this.client.createDataChannel(name, {
      negotiated: true,
      id: 0
    })

    let pingInterval = null

    this.send = data => {
      if (channel.readyState !== 'open') {
        this.client.close()
        return
      }

      if (typeof data === 'string') {
        var buf = new ArrayBuffer(data.length)
        var bufView = new Uint8Array(buf)
        for (let i = 0, dataLen = data.length; i < dataLen; i++) {
          bufView[i] = data.charCodeAt(i)
        }

        data = buf
      }

      let commandBuf = buffer.makeBytes(1, NETWORKING.DATA)
      channel.send(buffer.concatBuffer(commandBuf, data))
    }

    this.sendCommand = command => {
      if (channel.readyState !== 'open') {
        this.client.close()
        return
      }

      channel.send(buffer.makeBytes(1, command))
    }

    this.ping = () => {
      this.__lastPing = Date.now()
      this.sendCommand(NETWORKING.PING)
    }

    this.pong = () => {
      this.sendCommand(NETWORKING.PONG)
    }

    channel.onopen = ev => {
      log(`Peer ${this.id}, data channel opened.`)
      this.channelEvent.emit('open', ev)

      this.ping()

      pingInterval = setInterval(() => {
        this.ping()
      }, 5000)

      this.send('hi')
    }

    channel.onmessage = ev => {
      log('debug', `Got message through the data channel ${channel.label}.`, ev)
      this.channelEvent.emit('data', ev.data)
    }

    channel.onclose = ev => {
      log(`Peer ${this.id}, data channel closed.`)

      if (pingInterval) {
        clearInterval(pingInterval)
      }

      this.channelEvent.emit('close', ev)
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

  addChannelEventListener () {
    this.channelEvent.on('open', ev => {
      // on open
    })

    this.channelEvent.on('close', ev => {
      remove(this.id)
    })

    this.channelEvent.on('command', (command, data) => {
      log(`Got a command ${command}`, data)
    })

    this.channelEvent.on('data', async data => {
      this.lastActive = Date.now()

      if (typeof data === 'object') {
        if (data.arrayBuffer) {
          data = await data.arrayBuffer()
        }

        let view = new DataView(data)
        let firstByte = view.getUint8(0)

        if (firstByte == NETWORKING.PING) {
          this.pong()
          return
        }

        if (firstByte == NETWORKING.PONG) {
          this.latency = Date.now() - this.__lastPing
          return
        }

        let netKeys = Object.keys(NETWORKING)
        let netLen = netKeys.length
        for (var i = 0; i < netLen; i++) {
          let v = NETWORKING[netKeys[i]]

          if (v == firstByte) {
            this.channelEvent.emit('command', firstByte, data)
          }
        }
      }
    })
  }

  close () {
    this.client.close()
  }
}

/**
 * call cb with argument as clients.
 *
 * @param {*} cb Callback
 *
 * @returns Return null if clients size is 0.
 */
const all = cb => {
  let len = clientLists.length

  if (!len) {
    return null
  }

  for (var i = 0; i < len; i++) {
    cb(clientLists[i])
  }
}

/**
 * Find a client that id is 'id'.
 * @param {String} id Client ID
 */
const find = id => {
  let len = clientLists.length

  for (var i = 0; i < len; i++) {
    let client = clientLists[i]

    if (client && client.id === id) return client
  }

  return null
}

/**
 * Find a client that opposite side's id is 'id'.
 * @param {String} id Opposite client ID
 */
const findOpposite = id => {
  let len = clientLists.length

  for (var i = 0; i < len; i++) {
    let client = clientLists[i]

    if (client && client.oppositeId === id) return client
  }

  return null
}

/**
 * Remove client from list.
 */
const remove = id => {
  let len = clientLists.length

  for (var i = 0; i < len; i++) {
    let client = clientLists[i]

    if (client && client.id === id) {
      client.close()
      delete clientLists[i]
    }
  }

  clientLists = clientLists.filter(e => e != null)

  return null
}

/**
 * Return all clients.
 */
const clients = () => {
  return clientLists
}

module.exports = {
  RTCClient,
  clients,
  all,
  find,
  findOpposite,
  remove
}
