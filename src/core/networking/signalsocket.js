const NETWORKING = require('./enums')

const log = require('../utils/logs')
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

    this.queue = []

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

    this.on('open', () => {
      if (this.queue.length) {
        let len = this.queue.length

        for (var i = 0; i < len; i++) {
          let obj = this.queue[i]

          if (!obj || obj.d) {
            continue
          }

          this.ws.send(obj.query)

          this.queue.splice(i, 1)
          i--
        }
      }
    })

    /**
     * Default message command handler.
     */
    this.on('message', async ev => {
      let data

      if (typeof ev.data === 'string' && ev.data[0] === '[') {
        data = JSON.parse(ev.data)
      } else if (ev.data instanceof Blob) {
        data = new Uint8Array(await buffer.blobToArrayBuffer(ev.data))
      }

      if (typeof data === 'undefined') {
        return
      }

      log('debug', 'got a signal message. ', data)

      // data[0] [ >> CMD_NUM <<, data... ]
      if (typeof data[0] === 'number') {
        let objKeys = Object.keys(NETWORKING) // Command lists as key name
        for (var i = 0; i < objKeys.length; i++) {
          let e = NETWORKING[objKeys[i]]

          if (e == data[0]) {
            let slice = data.slice(1, data.length)

            data = undefined

            // FIXME : Not that good code, maybe.
            __eventRun(
              NETWORKING[objKeys[i]],
              typeof slice[0] === 'object' && !slice[1] ? slice[0] : slice
            )

            return
          }
        }
      }
    })

    pingInterval = setInterval(() => {
      this.ping()
    }, 30000)

    this.on('close', () => {
      clearInterval(pingInterval)

      setTimeout(this.connect, 1000)
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
   *
   * @param {*} data Data to send.
   * @param {Boolean} fail This command should send at this time. (don't wait)
   */
  sendQue (data, fail) {
    if (this.ws.readyState === WebSocket.CONNECTING && !fail) {
      this.queue.push({ q: data, d: false })

      return
    }

    this.ws.send(data)
  }

  /**
   * Send a command to server.
   *
   * @param {Number} ev NETWORKING Enum.
   * @param {*} data Data to send.
   * @param {Function} cb Callback (optional)
   * @param {Object} option option object (optional)
   */
  send (ev, data, cb, option) {
    let must = false

    if (typeof option === 'object' && option.must) {
      must = option.must
    }

    this.sendQue(makeCommand(ev, data), must)

    must = undefined

    if (typeof cb === 'function') {
      this.on(ev, cb)
    }
  }

  /**
   * Send a binary to server.
   *
   * @param {Number} ev NETWORKING Enum.
   * @param {Function} cb Callback (optional)
   * @param {Object} option option object (optional)
   */
  sendBinary (ev, cb, option) {
    this.sendQue(buffer.makeBytes(1, ev))

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
   * @param {Object} option option object (optional)
   */
  sendBinaryData (ev, data, cb, option) {
    let concat = buffer.concatBuffer(buffer.makeBytes(1, ev), data)
    data = undefined

    this.sendQue(concat)

    if (typeof cb === 'function') {
      this.on(ev, cb)
    }
  }

  /**
   * Send a BSON data to server.
   *
   * @param {Number} ev NETWORKING Enum.
   * @param {ArrayBuffer} data Data to send.
   * @param {Function} cb Callback (optional)
   */
  sendBSON (ev, data, cb) {
    return this.sendBinaryData(ev, buffer.objectToBSON(data), cb)
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
        data = buffer.hexStringConvert(data).split('')
        ;[8, 13, 18, 23].forEach(i => {
          data.splice(i, 0, '-')
        })

        data = data.join('')

        resolve(data)
      })
    })
  }

  sendOffer (data, uuid, id) {
    this.sendBSON(NETWORKING.createPeerOffer, {
      offer: data,
      to: uuid,
      fp: id
    })
  }

  sendAnswer (data, uuid, id, answer_peer) {
    this.sendBSON(NETWORKING.answerPeerOffer, {
      answer: data,
      to: uuid,
      fp: id,
      answer_peer
    })
  }

  sendICE (data, uuid, id) {
    this.sendBSON(NETWORKING.iceTransport, {
      c: data,
      to: uuid,
      fp: id
    })
  }

  requestMetadata (id, state) {
    if (typeof id !== 'string' && id.length !== 64) {
      throw new Error(`Not valid sha3 id.`)
    }

    let cc = buffer.concatBuffer(
      buffer.stringHexConvert(id),
      buffer.makeBytes(1, state)
    )

    return new Promise((resolve, reject) => {
      this.sendBinaryData(NETWORKING.RequestMetadata, cc, data => {
        resolve(data)
      })
    })
  }

  SubscribePeerWait (id) {
    if (typeof id !== 'string' && id.length !== 64) {
      throw new Error(`Not valid sha3 id.`)
    }

    return new Promise((resolve, reject) => {
      this.sendBinaryData(
        NETWORKING.SubscribePeerWait,
        buffer.stringHexConvert(id),
        data => {
          resolve(data)
        }
      )
    })
  }

  uploadMetadata (url, hash, blocks) {
    this.sendBSON(NETWORKING.uploadMetadata, { url, hash, blocks })
  }
}

module.exports = SignalClient
