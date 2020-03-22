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
  uploadMetadata: 0xA3,
  SendMetadata: 0xA4,
  PeerFound: 0xA6,
  createPeerOffer: 0xC1,
  answerPeerOffer: 0xC2,
  iceTransport: 0xC3,
  notifyBlockDone: 0xC4,
  RTCAssignShortID: 0xD0, // RTC Command
  RTCCheckBlock: 0xD1,
  RTCResponseNoBlock: 0xD2,
  RTCAnswerBlock: 0xD3,
  RTCRequestBlock: 0xD4,
}