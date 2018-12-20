import Presets from './presets'
import Config from './config'
import EventEmitter from 'events'
import Ffmpeg from '../util/ffmpeg'
import _ from 'lodash'

export default class Mcdl {
  tasks = []
  config = new Config()
  presets = new Presets(this)
  ffmpeg = new Ffmpeg()

  constructor () {
    const emitter = new EventEmitter()

    this.tasks.select = (filter) => {
      return _.filter(this.tasks, { labels: filter })
    }

    this.on = (...args) => {
      emitter.on(...args)
    }

    this.dispatch = (topic, ...args) => {
      emitter.emit('dispatch', topic, ...args)
    }

    this.presets.load()
  }
}
