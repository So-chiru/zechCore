const sha3 = require('js-sha3')

class Block {
  constructor (size) {
    this.size = size
    this.hash = null
    this.corrupted = null
  }

  empty () {
    return typeof this._buf === 'undefined' || this._buf.byteLength < 1
  }

  validate (hash) {
    return this.hash === hash
  }

  set buffer (buf) {
    if (!buf instanceof Blob) {
      throw new Error('buf is not an instanceof Blob object.')
    }

    this._buf = buf
    this.hash = hash(buf)
  }

  get buffer () {
    return this._buf
  }
}

const size = length => {
  return Math.ceil(length / 60000)
}

const hash = data => {
  return sha3.sha3_256(data)
}

module.exports = {
  Block,
  size,
  hash
}
