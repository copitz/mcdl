import Drivers from '../drivers'
import cacheManager from 'cache-manager'
import store from 'cache-manager-fs'

export default class Preset {
  stopped = false

  constructor (mcdl, id, config) {
    this.cache = cacheManager.caching({
      store,
      ttl: 60 * 5, // 5 minutes
      path: mcdl.config.cachePath
    })
    this.id = id
    this.config = config
    this.type = config.type || 'mixcloud'

    this.dispatch = (topic, object) => {
      Promise.resolve(object).then((result) => {
        if (!this.stopped) {
          mcdl.dispatch(topic, {preset: id, [topic]: object})
        }
      })
    }

    this.driver = Drivers.get(this.type)
  }

  stop () {
    // TODO: Cancel running tasks
    this.stopped = true
  }

  cached (key, method, ttl) {
    return this.cache.wrap(
      this.type + '/' + this.config.username + '/' + key,
      method,
      !isNaN(ttl) ? {ttl} : {}
    )
  }

  userInfo (ttl) {
    return this.cached('user', () => this.driver.userInfo(this.config.username), isNaN(ttl) ? 60 * 10 : ttl)
  }
}
