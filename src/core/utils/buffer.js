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
    str += bytes[i].toString(16)
  }

  return str
}

const objectToBSON = obj => BSON.serialize(obj)

const BSONtoObject = bson => BSON.deserialize(bson)

const concatBuffer = (buf1, buf2) => {
  let result = new Uint8Array(buf1.byteLength + buf2.byteLength)
  result.set(new Uint8Array(buf1), 0)
  result.set(new Uint8Array(buf2), buf1.byteLength)

  return result.buffer
}

module.exports = {
  makeBytes,
  stringHexConvert,
  hexStringConvert,
  objectToBSON,
  BSONtoObject,
  concatBuffer
}
