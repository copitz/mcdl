import Mcdl from '../mcdl'
import Drivers from '../drivers'

export default function (ipc) {
  const mcdl = new Mcdl()

  ipc.on('mcdl.handshake', (event) => {
    mcdl.on('dispatch', (...args) => event.sender.send('dispatch', ...args))
    event.returnValue = mcdl
  })

  ipc.sync('mcdl.cancelTasks', (filter) => { mcdl.tasks.select(filter).forEach(task => task.cancel()) })

  ipc.async('mcdl.drivers.userInfo', (type, username) => Drivers.get(type).userInfo(username))

  ipc.sync('mcdl.savePreset', (id, preset) => mcdl.presets.savePreset(id, preset))
  ipc.sync('mcdl.deletePreset', (id) => mcdl.presets.deletePreset(id))

  const p = (method) => (presetId, ...args) => mcdl.presets.get(presetId)[method](...args)
  ipc.sync('mcdl.presetLoadUser', p('loadUser'))
  ipc.sync('mcdl.presetLoadCasts', p('loadCasts'))
  ipc.sync('mcdl.presetLoadCastStats', p('loadCastStats'))
  ipc.sync('mcdl.presetDownloadAll', p('downloadAll'))
}
