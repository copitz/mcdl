import Presets from './presets'
import Config from './config'
import EventEmitter from 'events'

export default class Mcdl {
  tasks = []
  config = new Config()
  presets = new Presets(this)

  constructor () {
    const emitter = new EventEmitter()

    this.on = (...args) => {
      emitter.on(...args)
    }

    this.dispatch = (topic, ...args) => {
      emitter.emit(topic, ...args)
    }

    this.presets.load()
  }
}
