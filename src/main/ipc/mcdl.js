import Mcdl from '../mcdl'
import Drivers from '../drivers'

export default function (ipc) {
  const mcdl = new Mcdl()

  ipc.on('mcdl.handshake', (event) => {
    mcdl.on('dispatch', (...args) => event.sender.send('dispatch', ...args))
    event.returnValue = mcdl
  })

  ipc.async('mcdl.drivers.userInfo', (type, username) => Drivers.get(type).userInfo(username))
  ipc.async('mcdl.userInfo', (presetId, ...args) => mcdl.presets.get(presetId).userInfo(...args))
  ipc.sync('mcdl.savePreset', (id, preset) => mcdl.presets.savePreset(id, preset))
  ipc.sync('mcdl.deletePreset', (id) => mcdl.presets.deletePreset(id))
}
