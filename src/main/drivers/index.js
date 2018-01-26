import Mixcloud from './mixcloud'

export default class Drivers {
  static get (type) {
    if (type !== 'mixcloud') {
      throw new Error('Unknown driver ' + type)
    }
    return Mixcloud
  }
}
