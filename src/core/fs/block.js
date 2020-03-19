const sha3 = require('js-sha3')
const hasher = import('../../root/zechWASM')

const SIZE = 60000

let hashf = null
hasher.then(hashing => {
  let hasher = new hashing.Sha3Hasher()

  hashf = chunk => {
    hasher.update(chunk)
    chunk = undefined
    return hasher.hex_digest()
  }
})

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

    buf = undefined
  }

  get buffer () {
    return this._buf
  }

  remove () {
    this._buf = undefined
    delete this._buf
    
    this.hash = undefined
    this.corrupted = undefined
    return
  }
}

const size = length => {
  return Math.ceil(length / SIZE)
}

const hash = data => {
  if (data instanceof ArrayBuffer) {
    data = new Uint8Array(data)
  } else if (typeof data === 'string') {
    data = data.split('').map(v => v.charCodeAt(0))
  }

  data = hashf(data)

  return data
}

module.exports = {
  Block,
  size,
  hash,
  hash,
  SIZE
}
