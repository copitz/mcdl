import Drivers from '../drivers'
import path from 'path'
import mime from 'mime'
import fs from 'fs'
import DB from '../util/db'
import Task from './task'
import Download from '../util/download'
import Splitter from '../util/splitter'
import Brain from '../util/brain'

export default class Preset {
  stopped = false

  constructor (mcdl, id, config) {
    this.id = id
    this.config = config
    this.type = config.type || 'mixcloud'
    this.mcdl = mcdl

    let db = new DB(path.resolve(config.dir, 'mcdl.json'))
    this.db = () => {
      return db
    }
    this.settings = Object.assign({
      downloadedDir: './downloaded',
      meta: [
        {
          field: 'title',
          pattern: /^(?<title>.+?)(\((?<album_artist>[^)]+)\s+(remix|mix|edit)\))?( - (?<album>.+))?$/,
          flags: 'i'
        }
      ]
    }, db.get('config') || {})
    // bla

    this.dispatch = (topic, ...args) => {
      if (!this.stopped) {
        mcdl.dispatch('preset' + topic.charAt(0).toUpperCase() + topic.substr(1), id, ...args)
      }
    }

    this.driver = Drivers.get(this.type)
    this.brain = new Brain()
  }

  stop () {
    this.mcdl.tasks.select({ presetId: this.id }).forEach(task => task.cancel())
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
      labels: { presetId: this.id, topic: 'loading' },
      run: ({ id: fooId, progress, done, fail }) => {
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
      cancel: ({ canceled }) => { cancel = canceled }
    }).start()
  }

  loadCastStats () {
    let cancel
    new Task(this.mcdl, {
      labels: { presetId: this.id, topic: 'loading' },
      run: ({ progress, done }) => {
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
      cancel: ({ canceled }) => { cancel = canceled }
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
    const filePath = path.resolve(this.config.dir, this.settings.downloadedDir, fileName)
    const downloaded = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
    return { fileName, filePath, downloaded }
  }

  getCastTracks (id) {
    const cast = this.db().get('casts.' + id)
    const details = this.db().get('castDetails.' + id)
    if (!cast || !details) {
      console.error('Missing cast or cast details')
      return
    }
    const tracks = Splitter.getTracks(
      { username: this.config.username, meta: this.settings.meta }, cast, details
    )
    tracks.forEach((track) => this.brain.addObject(track.id, track.meta))
    this.brain.setDecisions(this.db().get('trackDecisions', {}))
    return tracks
  }

  setTrackDecision (id, decision) {
    this.brain.setDecision(id, decision)
    this.db().set('trackDecisions.' + id, decision)
  }

  getTrackDecisions () {
    return Promise.resolve(this.brain.getDecisions())
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
      stats[id] = { total, downloaded: current }
      if (current < total) {
        tasks.push(new Downloader(details.src.url, downloadInfo.filePath, this.mcdl, {
          labels: { presetId: this.id, castId: id, topic: 'downloading' },
          progress: { total, current },
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
