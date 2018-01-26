import Mcdl from './index'

class Progress {
  current = 0
  total = 0
  started = 0
  eta = Infinity
  rate = 0
  _task

  constructor (task) {
    this._task = task
  }

  setTotal (total) {
    this.total = total
    if (total > this.current) {
      this.current = total
    }
    if (!this.started) {
      this.started = new Date()
    }
    this.rate = 0
    if (this.rate) {
      this.eta = (this.total - this.current) / this.rate
    }
    this._task.dispatch('progress')
  }

  tick (size) {
    if (!this.total) {
      throw new Error('Set total before tick')
    }
    this.current += size || 0
    const elapsed = new Date() - this.start
    this.eta = (this.current && elapsed) ? elapsed * (this.total / this.current) : Infinity
    this.rate = (elapsed) ? this.current / (elapsed / 1000) : 0
    this._task.dispatch('progress')
  }
}

let id = 0

export default class Task {
  constructor (mcdl, labels) {
    this.id = ++id
    this.labels = labels || {}
    this.exitCode = null
    this.running = false

    this.progress = new Progress(this)
    mcdl.tasks.push(this)

    this.dispatch = (event) => {
      mcdl.dispatch('task', event, this)
    }

    this.done = (exitCode) => {
      this.exitCode = exitCode || 0
      this.running = false
      mcdl.tasks.splice(Mcdl.tasks.indexOf(this), 1)
      this.dispatch('done')
    }

    this.dispatch('registered')
  }

  setLabels (labels) {
    this.labels = labels
  }

  start () {
    this.running = true
    this.dispatch('started')
  }

  cancel () {
    this.done(130)
  }
}
