const eventBus = require('./utils/eventBus')

const STATES = {
  ACTIVE: 0x00,
  COOP: 0x01,
  DEPEND: 0x02
}

class State {
  constructor () {
    this._state = STATES.ACTIVE

    this.stateEvent = new eventBus()
  }

  set state (v) {
    this._state = v
    this.stateEvent.emit('change', v)
  }

  get state() {
    return this._state
  }

  SetActive () {
    this.state = STATES.ACTIVE
  }

  SetCOOP () {
    this.state = STATES.COOP
  }

  SetDepend () {
    this.state = STATES.DEPEND
  }
}

module.exports = {
  State,
  STATES
}
