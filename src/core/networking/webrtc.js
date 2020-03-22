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

    this.latency = 0

    this.addChannelEventListener()

    this.__reset = setTimeout(() => {
      if (this.client.connectionState !== 'connected') {
        this.close()

        log('error', `client ${this.id} timeout.`)
      }
    }, 10000)

    clientLists.push(this)
  }

  createClient () {
    this.client = new (RTCPeerConnection || webkitRTCPeerConnection)({
      iceServers: [
        {
          urls: ['stun:74.125.204.127:19302']
        },
        {
          urls: ['turn:175.114.141.247'],
          credential: 'zechliveapp',
          username: 'zechlive'
        }
      ]
    })
    this.id = uuid()
    this.oppositeId = null
    this.oppositeSignalId = null

    this.client.onicecandidate = ev => {
      if (ev.candidate) {
        this.events.emit('ice', ev.candidate)
      }
    }
  }

  addIceCandidate (candidate) {
    this.client.addIceCandidate(new RTCIceCandidate(candidate))
  }

  registerOppositePeer (id, sigId) {
    this.oppositeId = id
    this.oppositeSignalId = sigId
  }

  createDataChannel (name) {
    let channel = this.client.createDataChannel(name, {
      negotiated: true,
      id: 0
    })

    let pingInterval = null
    let sendInterval = null
    let sendCount = 0
    let lastPing = null

    this.send = (cmd, data) => {
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

      let commandBuf = buffer.makeBytes(1, cmd)
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
      lastPing = Date.now()
      this.sendCommand(NETWORKING.PING)
    }

    this.pong = () => {
      this.sendCommand(NETWORKING.PONG)
    }

    channel.onopen = ev => {
      this.channelEvent.emit('open', ev)

      clearTimeout(this.__reset)

      this.ping()

      pingInterval = setInterval(() => {
        this.ping()
      }, 5000)

      this.send(NETWORKING.DATA, 'hi')
    }

    channel.onmessage = async ev => {
      let data = ev.data

      sendCount++

      if (data instanceof Blob) {
        data = await buffer.blobToArrayBuffer(data)
      }

      if (data instanceof ArrayBuffer) {
        data = new Uint8Array(data)
      }

      if (data[0] === NETWORKING.PING) {
        return this.pong()
      } else if (data[0] === NETWORKING.PONG) {
        this.latency = Date.now() - lastPing
        return
      }

      log('debug', `Got message through the data channel ${channel.label}.`, ev)
      this.channelEvent.emit('data', data)
    }

    channel.onclose = ev => {
      this.channelEvent.emit('close', ev)

      if (pingInterval) {
        clearInterval(pingInterval)
      }
    }

    sendInterval = setInterval(() => {
      if (
        !this.client ||
        this.client.connectionState == 'closed' ||
        this.client.connectionState == 'disconnected'
      ) {
        remove(this.id)
        return
      }

      if (sendCount > 30) {
        this.close()
      }

      sendCount = 0
    }, 50)
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
      log('debug', `Got a command ${command}`, data)
    })

    this.channelEvent.on('data', async data => {
      this.lastActive = Date.now()

      if (data instanceof Uint8Array) {
        let firstByte = data[0]

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
 * call cb with argument as clients.
 *
 * @param {*} cb Callback
 *
 * @returns Return null if clients size is 0.
 */
const allConnected = cb => {
  let len = clientLists.length

  if (!len) {
    return null
  }

  for (var i = 0; i < len; i++) {
    if (
      !clientLists[i] ||
      clientLists[i].client.connectionState !== 'connected'
    ) {
      continue
    }

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
 * Find a client that opposite side's id is 'id'.
 * @param {String} id Opposite client ID
 */
const findOppositeSignal = id => {
  let len = clientLists.length

  for (var i = 0; i < len; i++) {
    let client = clientLists[i]
    if (client && client.oppositeSignalId === id) return client
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
const clients = () => clientLists

/**
 * Return all connected clients.
 */
const clientsConnected = () =>
  clientLists.filter(v => {
    return v.client.connectionState === 'connected'
  })

module.exports = {
  RTCClient,
  clients,
  clientsConnected,
  all,
  allConnected,
  find,
  findOpposite,
  findOppositeSignal,
  remove
}
