const SWNETWORK = require('./networking/sw_enums')
const eventBus = require('./utils/eventBus')
const uuid = require('./utils/uuid')

let workerEvent = new eventBus()
let worker

let cbHandler = {}

if (window.Worker) {
  worker = new Worker('/dev/zechworker.js')

  worker.onmessage = ev => {
    if (ev.data.id && cbHandler[ev.data.id]) {
      cbHandler[ev.data.id](ev.data)
    }
  }

  workerEvent.on('sendMessage', msg => {
    worker.postMessage(msg)
  })
}

window.onbeforeunload = () => {
  if (worker) {
    worker.terminate()
  }
}

const send = (cmd, data) => {
  return new Promise((resolve, reject) => {
    let id = uuid()
    let cbw = data => {
      resolve(data.res)
      delete cbHandler[id]
    }

    cbHandler[id] = cbw

    worker.postMessage({
      id,
      cmd,
      data
    })
  })
}

module.exports = {
  workerEvent,
  SWNETWORK,
  send
}
