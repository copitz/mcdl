const fs = require('graceful-fs')
const _ = require('lodash')

export default class DB {
  constructor (path) {
    this.path = path
    this.data = undefined
  }

  load () {
    if (!this.data) {
      this.data = {}
      if (fs.existsSync(this.path)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(this.path))
          if (typeof parsed === 'object') {
            this.data = parsed
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    return this.data
  }

  flush () {
    if (this.data) {
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2))
    }
  }

  set (path, data, flush) {
    _.set(this.load(), path, data)
    if (flush !== false) {
      this.flush()
    }
    return data
  }

  get (path, def) {
    return _.get(this.load(), path, def)
  }

  getPromised (path) {
    const value = this.get(path)
    return value === undefined ? Promise.reject(new Error(`Path ${path} not found`)) : Promise.resolve(value)
  }
}
