module.exports = {
  ERROR: 0x04, // Control
  PING: 0x09,
  PONG: 0x0a,
  DATA: 0x30, // Data
  BLOCK: 0x31,
  GetPeerLists: 0xB0, // Signal Command
  GetUUID: 0xA0,
  RequestMetadata: 0xA1,
  NoMetadata: 0xA2,
  createPeerOffer: 0xC1,
  answerPeerOffer: 0xC2,
  iceTransport: 0xC3,
  RTCRequestBlock: 0xD0, // RTC Command
  RTCAnswerBlock: 0xD1,
}