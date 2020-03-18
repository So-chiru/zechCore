const block = require('./block')

let filePool = {}

class File {
  constructor (hash) {
    this.hash = hash
    this.blockSize = null

    this.blockHashes = []
    this.blocks = []
    this.done = false
  }

  addBlock(block) {
    // this.blocks.push(block)
  }

  removeBlock(block) {

  }

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
