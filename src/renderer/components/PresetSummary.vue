<template>
  <div class="preset" :class="link ? 'preset-linked' : ''">
    <router-link 
      tag="div"
      :event="linkEvents"
      :to="{name: 'preset', params: {id}}" 
      class="preset-img" 
      :style="user && user.picture ? {backgroundImage: `url(${user.picture})`} : {}"
    ></router-link>

    <router-link tag="h6" :event="linkEvents" :to="{name: 'preset', params: {id}}" class="preset-title">
      {{preset.username}}
    </router-link>
    
    <router-link tag="div" :event="linkEvents" :to="{name: 'preset', params: {id}}" class="preset-stats">
      <template v-if="castStats">
        <p v-for="(stat, key) in {new: {icon: 'leaf', variant: 'success'}, incomplete: {icon: 'clock-o', variant: 'warning'}, downloaded: {icon: 'check', variant: 'info'}}">
          <i :class="['fa', 'fa-' + stat.icon, 'text-' + (castStats[key] ? stat.variant : 'muted')]"></i>
          <span>{{castStats[key]}}</span> {{key}}
        </p>
      </template>
    </router-link>

    <div class="preset-toolbar">
      <div class="preset-progress">
        <tasks
          :tasks="$root.mcdl.tasks"
          variant="secondary"
          :filter="{topic: 'loading', presetId: id}"
          @change="runningLoads = $event.running"
        />
        <tasks
          :tasks="$root.mcdl.tasks"
          :filter="{topic: 'downloading', presetId: id}"
          @change="runningDownloads = $event.length"
        />
      </div>

      <template v-if="castStats && (castStats.new || castStats.incomplete)">
        <b-button
          size="sm"
          v-if="runningDownloads"
          @click="$root.mcdl.cancelTasks({topic: 'downloading', presetId: id})"
        >
          <i class="fa fa-pause"></i>
          <span>Pause</span>
        </b-button>
        <b-button
          size="sm"
          variant="success"
          v-else
          @click="$root.mcdl.presetDownloadAll(id)"
        >
          <i class="fa fa-download"></i>
          <span>Download</span>
        </b-button>
      </template>
      <b-button class="ml-auto" size="sm" @click="remove = true" v-b-tooltip.hover.bottom title="Delete">
        <i class="fa fa-trash fa-sm"></i>
      </b-button>
    </div>

    <b-modal
      title="Delete preset"
      v-if="remove"
      visible
      @ok="$root.mcdl.deletePreset(id)"
      @hidden="remove = false">
      Do you really want to delete {{preset.username}}
    </b-modal>
  </div>
</template>

<script>
  export default {
    props: {
      id: {
        type: String,
        required: true
      },
      link: Boolean
    },
    data () {
      return {
        runningDownloads: 0,
        runningLoads: 0,
        remove: false
      }
    },
    computed: {
      preset () {
        return this.$root.mcdl.presets[this.id]
      },
      user () {
        return this.$root.mcdl.users[this.id]
      },
      castStats () {
        if (!this.$root.mcdl.castStats[this.id]) {
          return
        }
        const stats = {new: 0, downloaded: 0, incomplete: 0}
        Object.keys(this.$root.mcdl.castStats[this.id]).forEach(id => {
          const cast = this.$root.mcdl.castStats[this.id][id]
          if (!cast.downloaded) {
            stats.new++
          } else if (cast.total === cast.downloaded) {
            stats.downloaded++
          } else {
            stats.incomplete++
          }
        })
        return stats
      },
      linkEvents () {
        return this.link ? ['click'] : []
      }
    }
  }
</script>