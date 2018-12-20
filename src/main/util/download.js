import fs from 'fs-extra'
import https from 'https'
import Task from '../mcdl/task'

export default class Download extends Task {
  constructor (src, target, mcdl, options = {}) {
    super(mcdl, ...options)
    this.src = src
    this.target = target
  }

  start () {
    const _req = https.get(this.src)
    super.start(
      ({ done, fail }) => {
        const streamOptions = {}
        let start
        if (fs.existsSync(this.target)) {
          start = fs.statSync(this.target).size
          _req.setHeader('Range', 'bytes=' + start + '-')
        }
        _req.on('timeout', fail)
        _req.on('response', (res) => {
          if (res.statusCode < 200 || res.statusCode > 299) {
            fail(new Error('Download failed with statusCode ' + res.statusCode))
            return
          }
          const len = parseInt(res.headers['content-length'], 10)
          this.progress.setTotal(len)

          if (start && res.headers['content-range']) {
            const match = res.headers['content-range'].match(/^bytes ([0-9]+)-/)
            if (match && parseInt(match[1]) === start) {
              streamOptions.flags = 'a'
              streamOptions.start = start
              this.progress.setCurrent(start)
            }
          }

          res.pipe(fs.createWriteStream(this.target, streamOptions))

          res.on('error', fail)

          res.on('data', (chunk) => {
            this.progress.tick(chunk.length)
          })

          res.on('end', () => {
            done()
          })
        })
        _req.end()
      },
      ({ canceled }) => {
        _req.abort()
        canceled()
      }
    )
  }
}
