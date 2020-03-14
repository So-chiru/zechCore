(() => {
  let ws = new WebSocket('wss://zech.live/signal')

  ws.onopen = (ev) => {
    console.log('open', ev)
  }

  ws.onmessage = (ev) => {
    console.log('msg', ev)
  }

  ws.onclose = (ev) => {
    console.log('close', ev)
  }
})()