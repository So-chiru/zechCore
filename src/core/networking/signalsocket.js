const NETWORKING = require('./enums')
const buffer = require('../utils/buffer')

const makeCommand = (cmd, data) => {
  return JSON.stringify([cmd, data])
}

class SignalClient {
  constructor () {
    this.connect()
  }

  connect () {
    this.ws = new WebSocket('wss://zech.live/signal')

    let __events = {}
    let pingInterval

    let __eventRun = (event, ...args) => {
      if (!__events[event]) {
        return false
      }

      let eventsLen = __events[event].length
      for (var i = 0; i < eventsLen; i++) {
        __events[event][i](...args)
      }
    }

    this.ws.onopen = ev => __eventRun('open', ev)
    this.ws.onmessage = ev => __eventRun('message', ev)
    this.ws.onclose = ev => __eventRun('close', ev)

    /**
     * Listening an event.
     *
     * @param {String} event Event name.
     * @param {Function} cb Callback function.
     */
    this.on = (event, cb) => {
      if (!__events[event]) {
        __events[event] = []
      }

      __events[event].push(cb)
    }

    /**
     * Default message command handler.
     */
    this.on('message', ev => {
      let data
      if (typeof ev.data === 'string' && ev.data[0] === '[') {
        data = JSON.parse(ev.data)
      }

      if (typeof data === 'undefined') {
        return
      }

      if (typeof data[0] === 'number') {
        let objKeys = Object.keys(NETWORKING)
        for (var i = 0; i < objKeys.length; i++) {
          let e = NETWORKING[objKeys[i]]

          if (e == data[0]) {
            __eventRun(NETWORKING[objKeys[i]], data[1])
          }
        }
      }
    })

    pingInterval = setInterval(() => {
      this.ping()
    }, 30000)

    this.on('close', () => {
      clearInterval(pingInterval)
    })

    this.on(NETWORKING.ERROR, data => {
      console.error(`Got an error from the signal server: ${data}`)
    })
  }

  /**
   * Send a ping to server.
   */
  ping () {
    this.ws.send(buffer.makeBytes(1, NETWORKING.PING))
  }

  /**
   * Send a command to server.
   *
   * @param {Number} ev NETWORKING Enum.
   * @param {*} data Data to send.
   * @param {Function} cb Callback (optional)
   */
  send (ev, data, cb) {
    this.ws.send(makeCommand(ev, data))

    if (typeof cb === 'function') {
      this.on(ev, cb)
    }
  }

  /**
   * Send a binary to server.
   *
   * @param {Number} ev NETWORKING Enum.
   * @param {Function} cb Callback (optional)
   */
  sendBinary (ev, cb) {
    this.ws.send(buffer.makeBytes(1, ev))

    if (typeof cb === 'function') {
      this.on(ev, cb)
    }
  }

  /**
   * Send a binary data to server.
   *
   * @param {Number} ev NETWORKING Enum.
   * @param {ArrayBuffer} data Data to send.
   * @param {Function} cb Callback (optional)
   */
  sendBinaryData (ev, data, cb) {
    let concat = buffer.concatBuffer(buffer.makeBytes(1, ev), data)

    this.ws.send(concat)

    if (typeof cb === 'function') {
      this.on(ev, cb)
    }
  }

  /**
   * Get peers lists from the server.
   *
   * @param {Object} options Peer query option.
   * @param {Function} cb Callback
   */
  GetPeerLists (options, cb) {
    this.send(NETWORKING.GetPeerLists, options, cb)
  }

  /**
   * Get my WebSocket/Peer UUID from the server.
   */
  GetUUID () {
    return new Promise((resolve, reject) => {
      this.sendBinary(NETWORKING.GetUUID, data => {
        resolve(data)
      })
    })
  }

  sendOffer (data, uuid, id) {
    this.send(NETWORKING.createPeerOffer, {
      offer: data,
      to: uuid,
      from_peer: id
    })
  }

  sendAnswer (data, uuid, id, answer_peer) {
    this.send(NETWORKING.answerPeerOffer, {
      answer: data,
      to: uuid,
      from_peer: id,
      answer_peer
    })
  }

  sendICE (data, uuid, id) {
    this.send(NETWORKING.iceTransport, {
      candidate: data,
      to: uuid,
      from_peer: id
    })
  }

  requestMetadata (id) {
    if (typeof id !== 'string' && id.length !== 64) {
      throw new Error(`Not valid sha3 id.`)
    }

    return new Promise((resolve, reject) => {
      this.sendBinaryData(
        NETWORKING.RequestMetadata,
        buffer.stringHexConvert(id),
        data => {
          resolve(data)
        }
      )
    })
  }
}

module.exports = SignalClient
