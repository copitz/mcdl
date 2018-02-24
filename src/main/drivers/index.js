import Mixcloud from './mixcloud'
import Mock from './mock'

export default class Drivers {
  static get (type) {
    switch (type) {
      case 'mixcloud':
        return Mixcloud
      case 'mock':
        return Mock
    }

    throw new Error('Unknown driver ' + type)
  }
}
