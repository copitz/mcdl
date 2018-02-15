import Drivers from '../drivers'
import path from 'path'
import mime from 'mime'
import fs from 'fs'
import DB from '../util/db'

export default class Preset {
  stopped = false

  constructor (mcdl, id, config) {
    this.id = id
    this.config = config
    this.type = config.type || 'mixcloud'

    let db
    this.db = () => {
      if (!db) {
        db = new DB(path.resolve(config.dir, 'mcdl.json'))
      }
      return db
    }

    this.dispatch = (topic, ...args) => {
      if (!this.stopped) {
        mcdl.dispatch('preset' + topic.charAt(0).toUpperCase() + topic.substr(1), id, ...args)
      }
    }

    this.driver = Drivers.get(this.type)
  }

  stop () {
    // TODO: Cancel running tasks
    this.stopped = true
  }

  loadUser () {
    const db = this.db()
    this.driver.userInfo(this.config.username).then(
      (u) => this.dispatch('userLoaded', db.set('user', u)),
      (e) => this.dispatch('userLoaded', console.error(e) && db.get('user'))
    )
  }

  loadCasts () {
    const casts = this.db().get('casts', {})
    const next = (res) => {
      if (!res.cast || casts.hasOwnProperty(res.cast.id)) {
        this.dispatch('castsLoaded', casts)
        return
      }
      const id = res.cast.id
      delete res.cast.id
      this.db().set('casts.' + id, res.cast)
      res.next().then(next)
    }
    this.driver.casts(this.config.username)
      .then(next)
      .catch(console.error)
  }

  loadCastStats () {
    let promise = Promise.resolve()
    const stats = {}
    const casts = this.db().get('casts', {})
    Object.keys(casts).forEach(id => {
      promise = promise.then(
        this.getCastDetails(id, false).then(
          details => {
            const downloadInfo = this.getCastDownloadInfo(id, casts[id], details)
            stats[id] = {
              total: details.src.contentLength,
              downloaded: downloadInfo.downloaded
            }
          },
          error => {
            console.error(error)
          }
        )
      )
    })
    promise.then(() => {
      this.db().flush()
      this.dispatch('castStatsLoaded', stats)
    })
  }

  getCastDetails (id, flush) {
    return this.db().getPromised('castDetails.' + id)
      .catch(
        () => this.driver.cast(this.config.username, id)
          .then((details) => this.db().set('castDetails.' + id, details, flush))
      )
  }

  getCastDownloadInfo (id, cast, details) {
    const fileName = cast.created.substr(0, 10) + '-' + id + '.' + mime.getExtension(details.src.contentType)
    const filePath = path.resolve(this.config.dir, fileName)
    const downloaded = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
    return {fileName, filePath, downloaded}
  }
}
