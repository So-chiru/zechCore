module.exports = {
  ERROR: 0x04, // Control
  PING: 0x09,
  PONG: 0x0a,
  DATA: 0x30, // Data
  BLOCK: 0x31,
  GetPeerLists: 0xB0, // Signal Command
  GetUUID: 0xA0,
  createPeerOffer: 0xC1,
  answerPeerOffer: 0xC2,
  iceTransport: 0xC3,
  RTCRequestMetadata: 0xD0, // RTC Command
  RTCAnswerMetadata: 0xD1,
  RTCRequestBlock: 0xD2,
  RTCAnswerBlock: 0xD3,
}