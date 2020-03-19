const sha3 = require('js-sha3')
const hasher = import('../../root/zechWASM')

const SIZE = 60000

let hashf = null

hasher.then(hashing => {
  console.log(hashing)
  
  let hasher = new hashing.Sha3Hasher()

  hashf = chunk => {
    let len = chunk.length
    for (var i = 0; i < len; i++) {
      hasher.update(chunk[i])
    }

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
  }

  get buffer () {
    return this._buf
  }
}

const size = length => {
  return Math.ceil(length / SIZE)
}

const hash = data => {
  //return sha3.cshake128(data, 128)
  return hashf(data)
}

const hashBuffer = buf => {
  return hash(buf)
}

module.exports = {
  Block,
  size,
  hash,
  hashBuffer,
  SIZE
}
