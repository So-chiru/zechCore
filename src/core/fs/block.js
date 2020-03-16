const sha3 = require('js-sha3')

const size = length => {
  return Math.ceil(length / 60000)
}

const hash = data => {
  return sha3.sha3_256(data)
}

module.exports = {
  size,
  hash
}
