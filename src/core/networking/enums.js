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
  SubscribePeerWait: 0xA4,
  UnsubscribePeerWait: 0xA5,
  PeerFound: 0xA6,
  createPeerOffer: 0xC1,
  answerPeerOffer: 0xC2,
  iceTransport: 0xC3,
  RTCAssignShortID: 0xD0,
  RTCCheckBlock: 0xD1,
  RTCRequestBlock: 0xD2, // RTC Command
  RTCAnswerBlock: 0xD3,
}