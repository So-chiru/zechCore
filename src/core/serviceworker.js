const SWNETWORK = require('./networking/sw_enums')

const eventBus = require('./utils/eventBus')

const log = require('./utils/logs')

let workerEvent = new eventBus()

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/zechsw.js', {
      scope: '/'
    })
    .then(registration => {
      log('debug', `zechCore ServiceWorker Registered.`)
    })

  let alreadyRefreshing
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (alreadyRefreshing) return
    window.location.reload()
    alreadyRefreshing = true
  })

  navigator.serviceWorker.addEventListener('message', ev => {
    workerEvent.emit('message', ev.data)
  })

  workerEvent.on('sendMessage', (cmd, data) => {
    navigator.serviceWorker.controller.postMessage({
      cmd,
      data
    })
  })
}

module.exports = {
  workerEvent,
  SWNETWORK
}
