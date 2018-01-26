import pathinfo from 'path'
import cache from './cache'

export const defaultRequestOptions = {
  retry: 10,
  json: true
}

const baseUrl = 'https://api.mixcloud.com/'

process.on('uncaughtException', function (err) {
  console.log(err.stack)
})

const utils = {
  baseUrl: baseUrl,
  graphql: function (query, callback) {
    utils.request({
      url: 'https://www.mixcloud.com/graphql',
      json: true,
      body: query,
      headers: {
        Origin: 'https://www.mixcloud.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
        Authority: 'www.mixcloud.com',
        Cookie: 's=rvraezp54zuuwz788ldoqo75wywfklba'
      }
    }).then(data => data.data)
  },
  loadMcdl: function (dir) {
    const mcdlPath = dir + '/.mcdl'
    if (!fs.existsSync(mcdlPath)) {
      throw new Error('Missing project file (.mcdl)')
    }
    const mcdl = fs.readJsonSync(mcdlPath)
    if (!mcdl.cloudcasts) {
      throw new Error('No cloudcasts found in project')
    }
    return mcdl
  },
  acquireLock: function (targetDir, operation) {
    const lockFile = pathinfo.dirname(targetDir) + '/.' + pathinfo.basename(targetDir) + (operation ? '-' + operation : '') + '.lock'
    if (fs.existsSync(lockFile)) {
      console.log('Another process (PID ' + fs.readFileSync(lockFile) + ') locked ' + targetDir + (operation ? ' for ' + operation : ''))
      return false
    }
    fs.outputFileSync(lockFile, process.pid)
    const cleanup = function (exit) {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile)
      }
      if (exit) {
        process.exit()
      }
    }
    process.on('exit', function () {
      cleanup()
    })
    process.on('SIGINT', function () {
      cleanup(true)
    })
    process.on('uncaughtException', function () {
      cleanup()
    })
    return true
  },
  iterateCasts: function (casts, handler, options) {
    options = options || {}
    const castKeys = Object.keys(casts)
    const totalCasts = castKeys.length
    let offset = -1
    let handledCasts = 0
    const nextCast = function () {
      if (options.limit && options.limit === handledCasts) {
        return
      }
      const castKey = castKeys.shift()
      if (!castKey) {
        return
      }
      offset++
      const cast = casts[castKey]
      handledCasts++
      handler({
        current: cast,
        offset: offset,
        total: totalCasts,
        next: nextCast,
        skip: function () {
          handledCasts--
          nextCast()
        }
      })
    }
    nextCast()
  },
  userInfo: function (username) {
    if (!username || typeof username !== 'string') {
      throw new Error('Username must be string')
    }
    return cache.wrap('userInfo.' + username, () => utils.request(username + '/'), {ttl: 60 * 60 * 12})
  }
}

export default utils
