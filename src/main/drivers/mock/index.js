import Task from '../../mcdl/task'

function delay (res, delay = 500) {
  return new Promise(resolve => {
    setTimeout(() => resolve(res), 500)
  })
}

const contentLength = 23030000

class MockDownload extends Task {
  constructor (src, target, mcdl, options = {}) {
    super(mcdl, {
      ...options,
      done: () => {
        console.log(`Download ${this.id} done`)
        if (options.done) {
          options.done(this)
        }
      }
    })
    this.src = src
    this.target = target
  }

  start () {
    const maximum = 10
    let current = 0
    super.start(
      ({ progress, done }) => {
        console.log(`Download ${this.id} started`)
        this.interval = setInterval(() => {
          current++
          progress.tick(contentLength / maximum)
          console.log(`Download ${this.id}: ${Math.round(this.progress.current / this.progress.total * 100)}%`)
          if (current === maximum) {
            console.log(`Download ${this.id} ready`)
            clearInterval(this.interval)
            done()
          }
        }, 1000)
      },
      ({ canceled }) => {
        console.log(`Download ${this.id} canceled`)
        clearInterval(this.interval)
        canceled()
      }
    )
  }
}

let castId = 0

export default class Mock {
  static Downloader = MockDownload

  static userInfo (username) {
    return delay({
      link: 'https://example.com/' + username,
      picture: 'https://loremflickr.com/320/240',
      description: 'Lorem ipsum dolor sit amet'
    })
  }

  static casts (username) {
    let count = 10
    const total = count
    const next = () => {
      count--
      const id = 'cast' + (++castId)
      return delay({
        total,
        cast: {
          id,
          name: 'Lorem ipsum dolor sit',
          link: 'https://example.com/' + username + '/' + id,
          created: new Date() + ' ',
          updated: new Date() + ' ',
          length: Math.random() * 1000,
          image: 'https://loremflickr.com/240/300'
        },
        next: count ? next : () => Promise.resolve({})
      })
    }
    return next()
  }

  static cast (username, id) {
    return delay({
      src: {
        url: 'https://example.com/' + username + '/' + id + '/download',
        contentLength,
        contentType: 'audio/mp4'
      }
    })
  }
}
