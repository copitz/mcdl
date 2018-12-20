import { ipcRenderer } from 'electron'

let lastMessageId = 0

export default class IPC {
  static async (channel, ...args) {
    return new Promise((resolve, reject) => {
      const messageId = ++lastMessageId
      const resolveChannel = channel + '__' + messageId + '-resolve'
      const rejectChannel = channel + '__' + messageId + '-reject'
      const finish = (method) => (event, arg) => {
        ipcRenderer.removeAllListeners(resolveChannel)
        ipcRenderer.removeAllListeners(rejectChannel)
        method(arg)
      }
      ipcRenderer.once(resolveChannel, finish(resolve))
      ipcRenderer.once(rejectChannel, finish(reject))
      ipcRenderer.send(channel, resolveChannel, rejectChannel, ...args)
    })
  }

  static sync (channel, ...args) {
    return ipcRenderer.sendSync(channel, ...args)
  }

  static on (event, listener) {
    return ipcRenderer.on(event, listener)
  }
}

export const plugin = {
  install: function (Vue) {
    Vue.prototype.$ipc = IPC.async
    Vue.prototype.$ipcs = IPC.sync
  }
}
