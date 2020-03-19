// const block = require('./core/fs/block')

self.onmessage = async ev => {
  if (!ev.data) {
    return
  }

  // let res = await cmd[ev.data.cmd](ev.data.data)

  // self.postMessage({
  //   id: ev.data.id,
  //   res
  // })
}

// const cmd = {
//   hash (str) {
//     return block.hash(str)
//   },

//   hashBuffer (buf) {
//     return block.hashBuffer(buf)
//   }
// }