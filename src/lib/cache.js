import cacheManager from 'cache-manager'
import store from 'cache-manager-fs'
import config from './config'

export default cacheManager.caching({
  store,
  ttl: 60 * 60 * 5, // 5 minutes
  path: config.cachePath
})
