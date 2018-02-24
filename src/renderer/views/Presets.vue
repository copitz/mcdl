<template>
  <div>
    <div class="text-center" v-if="!Object.keys(presets).length">
      You don't have any presets yet<br>
      <router-link to="/presets/new">Create your first preset</router-link>
    </div>
    <div class="presets" columns v-else>
      <div class="preset" v-for="(preset, id) in presets" :key="id">
        <div class="preset-img" :style="{backgroundImage: `url(${users[id].picture})`}" v-if="users[id] && users[id].picture"></div>

        <h6>{{preset.username}}</h6>
        <div class="preset-stats">
          <template v-if="castStats[id]">
            <p v-for="(stat, key) in {new: {icon: 'leaf', variant: 'success'}, incomplete: {icon: 'clock-o', variant: 'warning'}, downloaded: {icon: 'check', variant: 'info'}}">
              <i :class="['fa', 'fa-' + stat.icon, 'text-' + (castStats[id][key] ? stat.variant : 'muted')]"></i>
              <span>{{castStats[id][key]}}</span> {{key}}
            </p>
          </template>
        </div>

        <div class="preset-toolbar">
          <div class="preset-progress">
            <tasks
              :tasks="$root.mcdl.tasks"
              variant="secondary"
              :filter="{topic: 'loading', presetId: id}"
              @change="$set(runningLoads, id, $event.running)"
            />
            <tasks
              :tasks="$root.mcdl.tasks"
              :filter="{topic: 'downloading', presetId: id}"
              @change="$set(runningDownloads, id, $event.length)"
            />
          </div>

          <template v-if="castStats[id] && (castStats[id].new || castStats[id].incomplete)">
            <b-button
              size="sm"
              v-if="runningDownloads[id]"
              @click="$root.mcdl.cancelTasks({topic: 'downloading', presetId: id})"
            >
              <i class="fa fa-pause"/>
              <span>Pause</span>
            </b-button>
            <b-button
              size="sm"
              variant="success"
              v-else
              @click="$root.mcdl.presetDownloadAll(id)"
            >
              <i class="fa fa-download"/>
              <span>Download</span>
            </b-button>
          </template>
          <b-button class="ml-auto" size="sm" @click="removeId = id" v-b-tooltip.hover.bottom title="Delete">
            <i class="fa fa-trash fa-sm"/>
          </b-button>
        </div>
      </div>
    </div>
    <b-modal
      title="Delete preset"
      v-if="removeId"
      visible
      @ok="$root.mcdl.deletePreset(removeId)"
      @hidden="removeId = undefined">
      Do you really want to delete {{presets[removeId] ? presets[removeId].username : ''}}
    </b-modal>
  </div>
</template>

<script>
  export default {
    name: 'presets',
    data () {
      return {
        removeId: undefined,
        runningLoads: {},
        runningDownloads: {}
      }
    },
    computed: {
      presets () { return this.$root.mcdl.presets },
      castStats () {
        const casts = {}
        Object.keys(this.$root.mcdl.castStats).forEach(presetId => {
          const stats = {downloaded: 0, incomplete: 0, new: 0}
          casts[presetId] = stats
          Object.keys(this.$root.mcdl.castStats[presetId]).forEach(id => {
            const cast = this.$root.mcdl.castStats[presetId][id]
            if (!cast.downloaded) {
              stats.new++
            } else if (cast.total === cast.downloaded) {
              stats.downloaded++
            } else {
              stats.incomplete++
            }
          })
        })
        return casts
      },
      users () { return this.$root.mcdl.users }
    }
  }
</script>

<style>

</style>