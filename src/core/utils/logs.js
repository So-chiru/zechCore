module.exports = (...inputs) => {
  inputs.forEach(str => {
    str = typeof str === 'object' ? JSON.stringify(str) : str
  })

  return console.log(
    `🔧 %c${new Date().toLocaleTimeString('en-US')} %c:`,
    `color: #888;`,
    `color: unset;`,
    ...inputs,
  )
}
