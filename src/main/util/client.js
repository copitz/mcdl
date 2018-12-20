import extend from 'extend'
import request from 'request'

export default class Client {
  constructor (options) {
    this.options = options || {}
    if (this.options.jar === true) {
      this.options.jar = request.jar()
    }
  }

  get (...urlOrOptions) {
    const options = extend({}, this.options)
    urlOrOptions.forEach((u) => {
      extend(true, options, typeof u === 'string' ? { url: u } : u)
    })
    if (options.url.match(/^https?:\/\//)) {
      delete options.baseUrl
    }
    const maxRetries = options.retry || 0
    let retries = 0
    return new Promise((resolve, reject) => {
      const tryRequest = function () {
        request(options, function (error, response, data) {
          if (error || ('' + response.statusCode)[0] !== '2') {
            if (retries < maxRetries) {
              retries++
              console.info(options.url + ' failed - retrying')
              setTimeout(tryRequest, 500)
            } else {
              const e = error || new Error(response.statusCode + ' - ' + response.statusMessage)
              e.response = response
              reject(e)
            }
          } else {
            response.body = data
            resolve(response)
          }
        }, reject)
      }
      tryRequest()
    })
  }

  post (...urlOrOptions) {
    return this.get(...urlOrOptions, { method: 'POST' })
  }

  head (...urlOrOptions) {
    return this.get(...urlOrOptions, { method: 'HEAD' })
  }

  jar () {
    return this.options.jar
  }

  getCookie (name) {
    if (!this.options.baseUrl) {
      throw new Error('Missing baseUrl')
    }
    return this.jar().getCookies(this.options.baseUrl).find(cookie => cookie.key === name)
  }
}
