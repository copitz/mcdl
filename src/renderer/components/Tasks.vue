<template>
  <div>
    <template v-if="ctrl.length">
      <b-progress
                  ref="progress"
                  height="2px"
                  :value="(ctrl.progress.total ? ctrl.progress.current / ctrl.progress.total : 1) * 100"
                  :animated="!ctrl.progress.total"
                  :variant="variant">
      </b-progress>
      <b-popover :target="$refs.progress" :title="title" triggers="hover">
        {{ctrl.running}} running {{ctrl.running < ctrl.length ? (ctrl.length - ctrl.running) + ' waiting' : ''}}
      </b-popover>
    </template>
  </div>
</template>

<script>
import _ from 'lodash'

export default {
  props: {
    tasks: {
      type: Array,
      required: true
    },
    filter: [Object, Function],
    variant: {
      type: String,
      default: 'info'
    },
    title: {
      type: String,
      default: 'Tasks'
    }
  },
  computed: {
    ctrl () {
      const progress = { rate: 0, eta: Infinity }
      let running = 0
      let length = 0
      if (!this.history) {
        this.history = { totals: {}, currents: {}, rate: 0 }
      }
      this.tasks.forEach((task) => {
        if (this.filter && !_.isMatch(task.labels, this.filter)) {
          return
        }
        length++
        this.history.totals[task.id] = task.progress.total || 0
        this.history.currents[task.id] = task.progress.current || 0
        if (task.running) {
          running++
        }
        if (task.rate) {
          this.history.rate = this.history.rate ? (this.history.rate + task.rate) / 2 : task.rate
        }
      })
      progress.total = Object.values(this.history.totals).reduce((a, b) => a + b, 0)
      progress.current = Object.values(this.history.currents).reduce((a, b) => a + b, 0)
      if (this.history.rate) {
        progress.rate = this.history.rate
        progress.eta = (progress.total - progress.current) / this.history.rate
      }
      if (!length) {
        delete this.history
      }
      const ctrl = {
        length,
        running,
        progress
      }
      this.$emit('change', ctrl)
      return ctrl
    }
  }
}
</script>
