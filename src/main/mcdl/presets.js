import pathinfo from 'path'
import fs from 'fs-extra'
import Preset from './preset'

function setupPreset (mcdl, id, preset) {
  if (preset.dir) {
    preset.dir = preset.dir.replace(/\/+$/, '')
    if (pathinfo.basename(preset.dir) !== preset.username) {
      preset.dir += '/' + preset.username
    }
  } else {
    preset.dir = mcdl.config.home((mcdl.config.isWin ? 'D' : 'd') + 'ownloads' + '/mcdl/' + preset.username)
  }

  const presetInstance = new Preset(mcdl, id, preset)
  preset.get = () => presetInstance
}

export default class Presets {
  all = {}

  constructor (mcdl) {
    this.mcdl = () => mcdl
    this.path = mcdl.config.home('presets.json')
  }

  get (id) {
    return this.all[id].get()
  }

  savePreset (id, preset) {
    if (this.all[id]) {
      this.all[id].get().stop()
    }
    setupPreset(this.mcdl(), id, preset)
    this.all[id] = preset
    fs.ensureDirSync(pathinfo.dirname(this.path))
    fs.writeJsonSync(this.path, this.all, {spaces: 2})
    this.mcdl().dispatch('presetSaved', id, preset)
  }

  deletePreset (id) {
    if (this.all[id]) {
      this.all[id].get().stop()
    }
    delete this.all[id]
    fs.writeJsonSync(this.path, this.all, {spaces: 2})
    this.mcdl().dispatch('presetDeleted', id)
  }

  load () {
    if (!fs.existsSync(this.path)) {
      return this
    }
    Object.keys(this.all).forEach((id) => this.get(id).stop())
    const presets = fs.readJsonSync(this.path)
    Object.keys(presets).forEach((key) => {
      setupPreset(this.mcdl(), key, presets[key])
    })
    this.all = presets
    this.mcdl().dispatch('presetsLoaded', this.all)
    return this
  }
}
