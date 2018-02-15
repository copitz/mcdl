import os from 'os'
import path from 'path'
import fs from 'fs'

export default class Ffmpeg {
  constructor () {
    const ffmpegPath = path.dirname(eval("require.resolve('ffmpeg-static')")) // eslint-disable-line no-eval
    const platform = os.platform()
    const arch = os.arch()
    const platformPath = path.resolve(ffmpegPath, 'bin', platform)
    const archPath = path.resolve(platformPath, arch)
    if (!fs.existsSync(platformPath)) {
      this.error = 'Platform ' + platform + ' not supported'
    } else if (!fs.existsSync(archPath)) {
      this.error = 'Architecture ' + arch + ' not supported'
    } else {
      this.path = path.resolve(archPath, 'ffmpeg' + (platform === 'win32' ? '.exe' : ''))
    }
  }
}
