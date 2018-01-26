import pathinfo from 'path'

export default class Config {
  isWin = process.platform === 'win32'
  homeDir = pathinfo.resolve(process.env[this.isWin ? 'USERPROFILE' : 'HOME'], '.mcdl')
  cachePath = this.home('cache')

  home (path) {
    return pathinfo.resolve(this.homeDir, path)
  }
}
