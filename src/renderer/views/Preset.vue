<template>
  <div class="preset-detail">
    <preset-summary :id="id"></preset-summary>

    <table class="table table-sm casts">
      <template v-for="cast in orderedCasts" :key="">
        <tr class="cast-title" :class="current === cast ? 'current' :''" @click="current = current === cast ? null : cast">
          <td :colspan="Math.max(1, selectedTags.length)">{{cast.name}}</td>
        </tr>
        <template v-if="current === cast">
          <tr class="cast-details" v-if="!selectedTags.length">
            <td>No tags {{availableTags.length ? 'selected' : 'available'}}</td>
          </tr>
          <template v-else>
            <tr class="cast-tracks-header text-capitalize">
              <th scope="col" v-for="tag in selectedTags">{{tag}}</th>
            </tr>
            <tr class="cast-track" v-for="(track, i) in cast.tracks">
              <td v-for="tag in selectedTags">
                <span :title="track.meta[tag] || ''">{{track.meta[tag] || '--'}}</span>
              </td>
            </tr>
          </template>
        </template>
      </template>
    </table>

    <div class="tags-toolbar d-flex">
      <b-dropdown size="sm" text="Show tags" class="ml-auto">
        <b-dropdown-item-button
          :disabled="selectedTags.length === 1 && selectedTags[0] === tag"
          v-for="tag in availableTags"
          :key="tag"
          @click="selectedTags = availableTags.filter(t => t === tag ? selectedTags.indexOf(t) < 0 : selectedTags.indexOf(t) > -1)"
          class="text-capitalize">
          <i class="fa" :class="selectedTags.indexOf(tag) > -1 ? 'fa-check-square-o' : 'fa-square-o'"></i>
          {{tag}}
        </b-dropdown-item-button>
      </b-dropdown>
    </div>
  </div>
</template>

<script>
  import PresetSummary from '../components/PresetSummary'

  export default {
    components: {PresetSummary},
    props: {
      id: {
        type: String,
        required: true
      }
    },
    data () {
      return {
        current: null,
        availableTags: [],
        selectedTags: []
      }
    },
    watch: {
      casts: {
        immediate: true,
        handler (casts) {
          const tags = {}
          if (casts) {
            Object.values(casts).forEach(cast => {
              if (cast.tracks) {
                cast.tracks.forEach(track => {
                  Object.keys(track.meta).forEach(tag => {
                    tags[tag] = true
                  })
                })
              }
            })
          }
          this.availableTags = Object.keys(tags)
        }
      },
      availableTags: {
        immediate: true,
        handler (availableTags) {
          if (availableTags) {
            this.selectedTags = this.selectedTags.filter(tag => availableTags.indexOf(tag) > -1)
            if (!this.selectedTags.length) {
              this.selectedTags = this.availableTags.slice(0, 3)
            }
          }
        }
      }
    },
    computed: {
      preset () {
        return this.$root.mcdl.presets[this.id]
      },
      casts () {
        const casts = {}
        Object.keys(this.$root.mcdl.casts[this.id] || {}).forEach(id => {
          const cast = casts[id] = {...this.$root.mcdl.casts[this.id][id]}
          cast.tracks = this.$root.mcdl.getCastTracks(this.id, id)
        })
        return casts
      },
      orderedCasts () {
        const answer = Object.values(this.casts)
        answer.sort((a, b) => new Date(b.created) - new Date(a.created))
        return answer
      }
    }
  }
</script>