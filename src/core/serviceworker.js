const SWNETWORK = require('./networking/sw_enums')

const eventBus = require('./utils/eventBus')

const log = require('./utils/logs')

let workerEvent = new eventBus()

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/dev/zechsw.js', {
      scope: '/dev/'
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
  
  workerEvent.on('sendMessage', (msg) => {
    navigator.serviceWorker.controller.postMessage(msg)
  })
}

module.exports = {
  workerEvent,
  SWNETWORK
}
