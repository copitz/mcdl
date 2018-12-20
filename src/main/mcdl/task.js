import _ from 'lodash'

class Progress {
  current = undefined
  total = undefined
  eta = Infinity
  rate = 0

  constructor (task) {
    this.task = () => task
    const options = task.options().progress
    if (options.total) {
      this.total = options.total
    }
    if (options.current) {
      this.current = options.current
    }
  }

  setTotal (total) {
    if (total === this.total) {
      return
    }
    this.total = total || 0
    if (this.current !== undefined) {
      if (this.total > this.current || this.current > this.total) {
        this.current = total
      }
      if (this.rate) {
        this.eta = (this.total - this.current) / this.rate
      }
    }
    this.task().dispatch('progress')
  }

  setCurrent (current) {
    if (current !== this.current) {
      this.current = 0
      this.tick(current)
    }
  }

  tick (size = 1) {
    if (this.total === undefined) {
      throw new Error('Set total before tick')
    }
    const task = this.task()
    if (!task.started) {
      task.started = new Date()
    }
    this.current = (this.current || 0) + (size || 0)
    const elapsed = new Date() - task.started
    this.eta = (this.current && elapsed) ? elapsed * (this.total / this.current) : Infinity
    this.rate = (elapsed) ? this.current / (elapsed / 1000) : 0
    task.dispatch('progress')
  }

  _finish (dispatch = true) {
    this.current = this.total
    this.eta = 0
  }
}

let id = 0

export default class Task {
  constructor (mcdl, options = {}) {
    this.id = ++id
    _.defaults(options, { labels: {}, progress: {} })
    this.labels = options.labels
    this.options = () => options
    this.exitCode = null
    this.running = false

    this.progress = new Progress(this)
    mcdl.tasks.push(this)

    this.dispatch = (event) => {
      mcdl.dispatch('task', event, this)
    }

    this.canceler = options.cancel

    this.done = (exitCode) => {
      if (this.exitCode !== null) {
        console.warn('Task was already done', this)
        return
      }
      this.canceling = false
      this.running = false
      this.exitCode = exitCode || this.exitCode || 0
      const index = mcdl.tasks.indexOf(this)
      if (index > -1) {
        mcdl.tasks.splice(index, 1)
      }
      this.progress._finish()
      this.dispatch('done')
      if (options.done) {
        options.done(this)
      }
    }

    this.fail = (error, exitCode = 1) => {
      console.error(error)
      this.done(exitCode)
    }

    this.canceled = () => this.done(130)

    this.dispatch('registered')
  }

  setLabels (labels) {
    this.labels = labels
  }

  start (runner = this.options().run, canceler = this.options().cancel) {
    this.started = new Date()
    this.canceler = canceler
    this.running = true
    if (runner) {
      runner(this)
    }
    this.dispatch('started')
  }

  cancel () {
    if (this.canceler) {
      this.canceling = true
      this.dispatch('canceling')
      this.canceler(this)
      return
    }
    this.done(130)
  }
}
