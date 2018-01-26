import {dialog} from 'electron'
import fs from 'fs'

export default function (ipc) {
  ipc.sync('electron.dialog.showOpenDialog', dialog.showOpenDialog)
  ipc.sync('fs.exists', fs.existsSync)
  ipc.sync('fs.isDirectory', dir => fs.statSync(dir).isDirectory())
}
