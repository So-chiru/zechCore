const makeBytes = (len, num) => {
  let b = new ArrayBuffer(len)
  let uint8 = new Uint8Array(b)

  uint8[len - 1] = num

  return b
}

module.exports = {
  makeBytes
}
