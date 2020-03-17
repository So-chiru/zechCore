module.exports = (...inputs) => {
  if (!DEBUG && inputs[0] == 'debug') return

  inputs.forEach(str => {
    str = typeof str === 'object' ? JSON.stringify(str) : str
  })

  let mode = 'info'

  switch (inputs[0]) {
    case 'warn':
      inputs[0] = '[WARNING]'
      mode = 'warn'
      break
    case 'error':
      inputs[0] = '[ERROR]'
      mode = 'error'
      break
    case 'debug':
      inputs[0] = '[DEBUG]'
      mode = 'debug'
      break
  }

  return console[mode](
    `🔧 %c${new Date().toLocaleTimeString('en-US')} %c:`,
    `color: #888;`,
    `color: unset;`,
    ...inputs
  )
}
