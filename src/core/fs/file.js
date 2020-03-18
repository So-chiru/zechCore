const block = require('./block')

let filePool = {}

class File {
  constructor (hash) {
    this.hash = hash
    this.blockLength = null

    this.blockHashes = []
    this.blocks = []
    this.done = false
  }

  from (buf) {
    if (!(buf instanceof ArrayBuffer)) {
      throw new Error(
        `Argument buf should be ArrayBuffer, not ${
          typeof buf === 'undefined' ? typeof buf : buf.constructor.name
        }`
      )
    }

    this.blockLength = block.size(buf.byteLength)

    for (var i = 0; i < this.blockLength; i++) {
      let s = i * block.SIZE

      let blockSlice = buf.slice(
        s,
        s + (buf.byteLength - s > block.SIZE ? block.SIZE : buf.byteLength - s)
      )

      this.addBlock(blockSlice)
    }

    // this.blockDumpHash()
  }

  blockDumpHash () {
    let len = this.blocks.length
    for (var i = 0; i < len; i++) {
      this.blockHashes[i] = block.hashBuffer(this.blocks[i])
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
    }

    delete filePool[this.hash]
  }
}

const get = id => {
  return filePool[id]
}

module.exports = {
  File
}
