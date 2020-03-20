const BSON = require('bson')

const makeBytes = (len, data) => {
  let buf = new ArrayBuffer(len)
  let uint8 = new Uint8Array(buf)

  let handleData = []

  if (typeof data === 'string') {
    let len = data.length
    for (var i = 0; i < len; i++) {
      let char = data.charCodeAt(i)

      handleData.push(char)
    }
  } else {
    handleData.push(data)
  }

  for (var i = 0; i < len; i++) {
    let dat = handleData[i]

    uint8[i] = dat
  }

  return buf
}

const stringHexConvert = str => {
  let split = str.match(/.{2}/g)
  let len = split.length

  let final = new ArrayBuffer(str.length / 2)
  let view = new Uint8Array(final)

  for (var i = 0; i < len; i++) {
    view[i] = parseInt(split[i], 16)
  }

  return final
}

const hexStringConvert = bytes => {
  let str = ''

  let len = bytes.length
  for (var i = 0; i < len; i++) {
    let s = bytes[i].toString(16)
    str += s.length < 2 ? '0' + s : s
  }

  return str
}

const objectToBSON = obj => BSON.serialize(obj)

const BSONtoObject = bson => BSON.deserialize(bson)

const concatBuffer = (...bufs) => {
  let len = bufs.length
  let bytelen = bufs.reduce((p, c) => p.length + c.length)

  let result = new Uint8Array(bytelen)

  for (var i = 0; i < len; i++) {
    let buf = bufs[i]

    let tmp = new Uint8Array(result.byteLength + buf.byteLength)
    tmp.set(result, 0)
    tmp.set(new Uint8Array(buf), result.byteLength)

    result = tmp
  }

  return result.buffer
}

const decode = buffer => {
  return String.fromCharCode(...buffer)
}

module.exports = {
  decode,
  makeBytes,
  stringHexConvert,
  hexStringConvert,
  objectToBSON,
  BSONtoObject,
  concatBuffer
}
