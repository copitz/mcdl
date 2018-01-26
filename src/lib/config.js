import fs from 'fs-extra'
import pathinfo from 'path'

const isWin = process.platform === 'win32'
const home = process.env[isWin ? 'USERPROFILE' : 'HOME']
const presetsPath = pathinfo.resolve(home, '.mcdl/presets.json')
const cachePath = pathinfo.resolve(home, '.mcdl/cache')

const config = {
  presetsPath,
  cachePath,
  ffmpeg: {
    profiles: {
      default: {
        options: ['-acodec', 'copy']
      },
      mp3: {
        options: ['-acodec', 'mp3', '-ab', '256000'],
        extension: 'mp3'
      }
    }
  },
  presets: {},
  savePreset (id, preset) {
    config.presets[id] = preset
    fs.ensureDirSync(pathinfo.dirname(presetsPath))
    fs.writeJsonSync(presetsPath, config.presets, {spaces: 2})
  },
  deletePreset (id) {
    delete config.presets[id]
    fs.writeJsonSync(presetsPath, config.presets, {spaces: 2})
  },
  reload () {
    if (!fs.existsSync(presetsPath)) {
      return
    }
    const presets = fs.readJsonSync(presetsPath)
    Object.keys(presets).forEach((key) => {
      const preset = presets[key]
      if (preset.dir) {
        preset.dir = preset.dir.replace(/\/+$/, '')
        if (pathinfo.basename(preset.dir) !== preset.username) {
          preset.dir += '/' + preset.username
        }
      } else {
        preset.dir = home + '/' + (isWin ? 'D' : 'd') + 'ownloads' + '/mcdl/' + preset.username
      }
    })
    config.presets = presets
  }
}

config.reload()

export default config
