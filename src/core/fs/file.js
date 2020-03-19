const block = require('./block')
const buffer = require('../utils/buffer')

let filePool = {}

class File {
  constructor (any) {
    this.blockLength = null

    this.blockHashes = []
    this.blocks = []
    this.done = false

    if (any instanceof ArrayBuffer) {
      this.setHash(any)
      this.from(any)
    }

    filePool[this.hash] = this
  }

  async setHash (buf) {
    this.hash = block.hash(buf)

    buf = undefined
  }

  validateHashes () {
    return block.hash(buffer.concatBuffer(...this.blocks)) === this.hash
  }

  from (buf) {
    this.blockLength = block.size(buf.byteLength)

    for (var i = 0; i < this.blockLength; i++) {
      let s = i * block.SIZE
      let bufLen = buf.byteLength

      let blockSlice = buf.slice(
        s,
        s + (bufLen - s > block.SIZE ? block.SIZE : bufLen - s)
      )

      bufLen = undefined

      let blk = new block.Block(blockSlice.byteLength)
      blk.buffer = blockSlice

      blockSlice = undefined

      this.addBlock(blk)

      blk = undefined
    }

    this.blockDumpHash()
    this.done = this.validateHashes()

    buf = undefined
  }

  async blockDumpHash () {
    let len = this.blocks.length
    for (var i = 0; i < len; i++) {
      this.blockHashes[i] = block.hash(this.blocks[i]._buf)
    }
  }

  addBlock (block) {
    this.blocks.push(block)
  }

  removeBlock (block) {}

  remove () {
    let len = this.blocks.length

    for (let i = 0; i < len; i++) {
      this.blocks[i].remove()
      delete this.blocks[i]
    }

    this.blocks = []

    filePool[this.hash] = undefined
    delete filePool[this.hash]

    this.hash = undefined
  }
}

const get = id => {
  return filePool[id]
}

module.exports = {
  File
}
