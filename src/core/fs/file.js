const block = require('./block')
const buffer = require('../utils/buffer')

let filePool = {}

class File {
  constructor (any, urlHash) {
    this.blockLength = null

    this.urlHash = urlHash

    this.blockHashes = []
    this.blocks = []
    this.done = false

    if (any instanceof ArrayBuffer) {
      this.setHash(any)
      this.from(any)
    } else if (any) {
      this.hash = any
    }

    if (!this.hash) {
      throw new Error('Hash is not defined.')
    }

    filePool[urlHash] = this
  }

  addHash (hash, blocks) {
    this.hash = hash
    this.blockHashes = blocks
  }

  setHash (buf) {
    this.hash = block.hash(buf)

    buf = undefined
  }

  validateHashes () {
    return (
      block.hash(buffer.concatBuffer(...this.blocks.map(v => v._buf))) ===
      this.hash
    )
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

      this.addBlock(blk)
    }

    this.blockHashes = this.blockDumpHash()
    this.done = this.validateHashes()
  }

  blockDumpHash () {
    let len = this.blocks.length
    let blk = []

    for (var i = 0; i < len; i++) {
      blk[i] = block.hash(this.blocks[i].buffer)
    }

    return blk
  }

  getBlock (block) {
    return this.blocks[block]
  }

  addBlock (blk, index) {
    if (typeof index === 'number') {
      if (this.blockHashes[index] !== blk.hash) {
        throw new Error('Block is invalid.')
      }

      this.blocks[index] = blk

      if (this.onBlock) {
        this.onBlock(blk, index, this.blockHashes)
      }

      return
    } else {
      this.blocks.push(blk)
    }
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
  File,
  get
}
