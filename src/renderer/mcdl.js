import Vue from 'vue'
import IPC from './ipc'

class Handlers {
  constructor (mcdl) {
    this.mcdl = mcdl
  }

  _registerPreset (id, preset) {
    Vue.set(this.mcdl.presets, id, preset)
    IPC.sync('mcdl.presetLoadUser', id)
    IPC.sync('mcdl.presetLoadCasts', id)
  }

  presetsLoaded (presets) {
    Vue.set(this.mcdl, 'presets', {})
    Vue.set(this.mcdl, 'users', {})
    Vue.set(this.mcdl, 'casts', {})
    Object.keys(presets).forEach((id) => this._registerPreset(id, presets[id]))
  }

  presetSaved (id, preset) {
    this._registerPreset(id, preset)
  }

  presetDeleted (id) {
    Vue.delete(this.mcdl.presets, id)
    Vue.delete(this.mcdl.users, id)
    Vue.delete(this.mcdl.casts, id)
  }

  presetUserLoaded (id, user) {
    Vue.set(this.mcdl.users, id, user)
  }

  presetCastsLoaded (id, casts) {
    Vue.set(this.mcdl.casts, id, casts)
    IPC.sync('mcdl.presetLoadCastStats', id)
  }

  presetCastStatsLoaded (id, stats) {
    Vue.set(this.mcdl.castStats, id, stats)
  }

  task (event, task) {
    const tasks = this.mcdl.tasks
    const indexOf = tasks.findIndex(t => t.id === task.id)
    if (task.exitCode === 0 || task.exitCode === 130) {
      if (indexOf > -1) {
        tasks.splice(indexOf, 1)
      }
    } else {
      if (indexOf > -1) {
        tasks.splice(indexOf, 1, task)
      } else {
        tasks.push(task)
      }
    }
  }
}

export default class Mcdl {
  presets = {}
  tasks = []
  users = {}
  casts = {}
  castStats = {}

  driverTypes = [{name: 'mixcloud', title: 'MixCloud'}, {name: 'mock', title: 'MockCloud'}]

  constructor () {
    const handlers = new Handlers(this)
    const handler = (e, topic, ...args) => {
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

    const mcdl = IPC.sync('mcdl.handshake')

    Vue.set(this, 'tasks', mcdl.tasks)
    handler({}, 'presetsLoaded', mcdl.presets.all)
  }

  deletePreset (id) {
    IPC.sync('mcdl.deletePreset', id)
  }

  cancelTasks (filter) {
    IPC.sync('mcdl.cancelTasks', filter)
  }

  presetDownloadAll (id) {
    IPC.sync('mcdl.presetDownloadAll', id)
  }

  getCastTracks (presetId, castId) {
    return IPC.sync('mcdl.getCastTracks', presetId, castId)
  }
}
