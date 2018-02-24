import Drivers from '../drivers'
import path from 'path'
import mime from 'mime'
import fs from 'fs'
import DB from '../util/db'
import Task from './task'
import Download from '../util/download'

export default class Preset {
  stopped = false

  constructor (mcdl, id, config) {
    this.id = id
    this.config = config
    this.type = config.type || 'mixcloud'
    this.mcdl = mcdl

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
    this.mcdl.tasks.select({presetId: this.id}).forEach(task => task.cancel())
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
    let cancel
    new Task(this.mcdl, {
      labels: {presetId: this.id, topic: 'loading'},
      run: ({id: fooId, progress, done, fail}) => {
        const casts = this.db().get('casts', {})
        const next = (res) => {
          if (cancel) {
            cancel()
            return
          }
          progress.setTotal(res.total)
          if (!res.cast || casts.hasOwnProperty(res.cast.id)) {
            done()
            this.dispatch('castsLoaded', casts)
            return
          }
          progress.tick()
          const id = res.cast.id
          delete res.cast.id
          this.db().set('casts.' + id, res.cast)
          return res.next().then(next)
        }
        this.driver.casts(this.config.username)
          .then(next)
          .catch(fail)
      },
      cancel: ({canceled}) => { cancel = canceled }
    }).start()
  }

  loadCastStats () {
    let cancel
    new Task(this.mcdl, {
      labels: {presetId: this.id, topic: 'loading'},
      run: ({progress, done}) => {
        const stats = {}
        const casts = this.db().get('casts', {})
        const castIds = Object.keys(casts)
        progress.setTotal(castIds.length)
        const next = () => {
          const id = castIds.shift()
          if (cancel) {
            cancel()
          } else if (id) {
            this.getCastDetails(id, false).then(
              details => {
                const downloadInfo = this.getCastDownloadInfo(id, casts[id], details)
                stats[id] = {
                  total: details.src.contentLength,
                  downloaded: downloadInfo.downloaded
                }
                progress.tick()
                next()
              },
              error => {
                console.error(error)
                progress.tick()
                next()
              }
            )
          } else {
            this.db().flush()
            this.dispatch('castStatsLoaded', stats)
            done()
          }
        }
        next()
      },
      cancel: ({canceled}) => { cancel = canceled }
    }).start()
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

  downloadAll () {
    const casts = this.db().get('casts')
    const castDetails = this.db().get('castDetails')
    const tasks = []
    const stats = {}
    const Downloader = this.driver.Downloader || Download
    const next = () => {
      const task = tasks.shift()
      if (task) {
        task.start()
        if (!stats[task.labels.castId].downloaded) {
          stats[task.labels.castId].downloaded = 1
          this.dispatch('castStatsLoaded', stats)
        }
      }
    }
    Object.keys(castDetails).forEach(id => {
      const details = castDetails[id]
      const downloadInfo = this.getCastDownloadInfo(id, casts[id], details)
      const current = downloadInfo.downloaded
      const total = details.src.contentLength
      stats[id] = {total, downloaded: current}
      if (current < total) {
        tasks.push(new Downloader(details.src.url, downloadInfo.filePath, this.mcdl, {
          labels: {presetId: this.id, castId: id, topic: 'downloading'},
          progress: {total, current},
          done: (task) => {
            if (!task.exitCode) {
              next()
              stats[id].downloaded = task.progress.current
              this.dispatch('castStatsLoaded', stats)
            }
          }
        }))
      }
    })
    next()
  }
}
