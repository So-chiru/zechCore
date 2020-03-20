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
    }, 5000)

    clientLists.push(this)
  }

  createClient () {
    this.client = new (RTCPeerConnection || webkitRTCPeerConnection)({
      iceServers: [
        {
          urls: [
            'stun:74.125.204.127:19302'
          ]
        },
        // {
        //   url: 'turn:numb.viagenie.ca',
        //   credential: 'muazkh',
        //   username: 'webrtc@live.com'
        // },
        // {
        //   url: 'turn:turn-pus.zech.live',
        //   credential: 'zechliveapp',
        //   username: 'zechlive'
        // }
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
    let lastPing = null

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

      this.send('hi')
    }

    channel.onmessage = async ev => {
      let data = ev.data

      if (data instanceof Blob) {
        data = await data.arrayBuffer()
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
    if (clientLists[i].connectionState !== 'connected') {
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
    return v.connectionState === 'connected'
  })

module.exports = {
  RTCClient,
  clients,
  clientsConnected,
  all,
  find,
  findOpposite,
  findOppositeSignal,
  remove
}
