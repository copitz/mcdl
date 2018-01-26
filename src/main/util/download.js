import fs from 'fs-extra'
import https from 'https'
import url from 'url'
import Task from '../mcdl/task'

export default class Download extends Task {
  constructor (src, target, mcdl, labels) {
    super(mcdl, labels)
    this.src = src
    this.target = target
  }

  start () {
    super.start()

    const requestOptions = url.parse(this.src)
    const streamOptions = {}
    let start
    if (fs.existsSync(this.target)) {
      start = fs.statSync(this.target).size
      requestOptions.headers = {'Range': 'bytes=' + start + '-'}
    }
    this._req = https.get(this.src)
    this._req.on('response', function (res) {
      const len = parseInt(res.headers['content-length'], 10)
      this.progress.setTotal(len)

      if (start && res.headers['content-range']) {
        const match = res.headers['content-range'].match(/^bytes ([0-9]+)-/)
        if (match && parseInt(match[1]) === start) {
          streamOptions.flags = 'a'
          streamOptions.start = start
          this.progress.tick(start)
        }
      }

      res.pipe(fs.createWriteStream(this.target, streamOptions))

      res.on('data', (chunk) => {
        this.progress.tick(chunk.length)
      })

      res.on('end', () => {
        delete this._req
        this.done()
      })
    })

    this._req.end()
  }

  cancel () {
    if (this._req) {
      this._req.abort()
      delete this._req
    }
    return super.cancel()
  }
}
