import Vue from 'vue'
import IPC from './ipc'

class Handlers {
  constructor (mcdl) {
    this.mcdl = mcdl
  }

  _registerPreset (id, preset) {
    Vue.set(this.mcdl.presets, id, preset)
    IPC.async('mcdl.userInfo', id).then((user) => Vue.set(this.mcdl.users, id, user))
  }

  presetsLoaded (presets) {
    Vue.set(this.mcdl, 'presets', {})
    Vue.set(this.mcdl, 'users', {})
    Object.keys(presets).forEach((id) => this._registerPreset(id, presets[id]))
  }

  presetSaved (id, preset) {
    this._registerPreset(id, preset)
  }

  presetDeleted (id) {
    Vue.delete(this.mcdl.presets, id)
  }
}

export default class Mcdl {
  presets = {}
  tasks = []
  users = {}

  constructor () {
    const mcdl = IPC.sync('mcdl.handshake')

    const handlers = new Handlers(this)
    const handler = (topic, ...args) => {
      if (Handlers.prototype.hasOwnProperty(topic)) {
        if (typeof Handlers.prototype[topic] !== 'function') {
          console.error(`Handlers.${topic} is no function`)
        } else {
          handlers[topic](...args)
        }
      } else {
        console.error(`Handlers.${topic} is not defined`)
      }
    }
    IPC.on('dispatch', handler)

    Vue.set(this, 'tasks', mcdl.tasks)
    handler('presetsLoaded', mcdl.presets.all)
  }
}
