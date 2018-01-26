import extend from 'extend'
import request from 'request'

export default class Client {
  constructor (defaultRequestOptions) {
    this.defaultRequestOptions = defaultRequestOptions || {}
  }

  get (urlOrOptions) {
    const options = extend({}, this.defaultRequestOptions, typeof urlOrOptions === 'string' ? {url: urlOrOptions} : urlOrOptions)
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
            resolve(data)
          }
        })
      }
      tryRequest()
    })
  }
}
