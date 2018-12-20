import { ipcMain } from 'electron'

const modules = [
  require('./general').default,
  require('./mcdl').default
]

function convertError (error) {
  return Object.assign({
    message: error.message,
    stack: error.stack
  }, error)
}

export default class IPC {
  /**
   * @type {BrowserWindow}
   */
  window

  static main

  constructor (window) {
    this.window = window
    modules.forEach(module => module(this))
  }

  static start (window) {
    IPC.main = new IPC(window)
    return IPC.main
  }

  on (...args) {
    return ipcMain.on(...args)
  }

  sync (channel, callback) {
    ipcMain.on(channel, (event, ...args) => {
      const res = callback(...args) // eslint-disable-line standard/no-callback-literal
      event.returnValue = res === undefined ? null : res
    })
  }

  async (channel, callback) {
    ipcMain.on(channel, (event, resolveChannel, rejectChannel, ...args) => {
      try {
        callback(...args).then( // eslint-disable-line standard/no-callback-literal
          (answer) => event.sender.send(resolveChannel, answer),
          (error) => event.sender.send(rejectChannel, convertError(error))
        )
      } catch (error) {
        event.sender.send(rejectChannel, convertError(error))
      }
    })
  }
}
