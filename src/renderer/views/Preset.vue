<template>
  <div class="preset-detail">
    <preset-summary :id="id"></preset-summary>

    <table class="table table-sm casts">
      <template v-for="(cast, castId) in orderedCasts" :key="">
        <tr class="cast-title" :class="selection[castId] ? 'current' :''" @click="selection[castId] ? $delete(selection, castId) : $set(selection, castId, 1)">
          <td :colspan="Math.max(1, selectedTags.length) + 1">{{cast.name}}</td>
        </tr>
        <template v-if="selection[castId]">
          <tr class="cast-details" v-if="!selectedTags.length">
            <td :colspan="Math.max(1, selectedTags.length) + 1">No tags {{availableTags.length ? 'selected' : 'available'}}</td>
          </tr>
          <template v-else>
            <tr class="cast-tracks-header text-capitalize">
              <th scope="col"><i class="fa fa-square-o"></i></th>
              <th scope="col" v-for="tag in selectedTags">{{tag}}</th>
            </tr>
            <tr class="cast-track" v-for="track in cast.tracks">
              <th scope="row">
                <i class="fa fa-circle-o-notch fa-spin" v-if="!trackDecisions"></i>
                <span v-else @click="toggleTrackDecision(track)">
                  <i
                    class="text-muted fa"
                    v-if="typeof trackDecisions[track.id] === 'number'"
                    :class="trackDecisions[track.id] >= treshold ? 'fa-check-square-o' : 'fa-square-o'"
                    :title='trackDecisions[track.id]'
                  ></i>
                  <i v-else
                     class="fa"
                     :class="trackDecisions[track.id] === false ? 'fa-square-o' : 'fa-check-square-o' + (trackDecisions[track.id] ? '' : ' text-muted')"

                  ></i>
                </span>
              </th>
              <td v-for="tag in selectedTags">
                <span :title="track.meta[tag] || ''">{{track.meta[tag] || '--'}}</span>
              </td>
            </tr>
          </template>
        </template>
      </template>
    </table>

    <div class="tags-toolbar d-flex">
      <b-btn v-if="changedTrackDecisions" @click="commitTrackDecisions">Commit selections</b-btn>
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
        selectedTags: [],
        trackDecisions: null,
        changedTrackDecisions: 0,
        selection: {},
        treshold: 0.5
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
          cast.tracks.forEach((track, i) => { track.id = id + '-' + i })
        })
        this.$root.mcdl.getTrackDecisions(this.id).then(decisions => {
          this.trackDecisions = decisions
        })
        return casts
      },
      orderedCasts () {
        const answer = Object.values(this.casts)
        answer.sort((a, b) => new Date(b.created) - new Date(a.created))
        return answer
      }
    },
    methods: {
      toggleTrackDecision (track) {
        let current = this.trackDecisions[track.id]
        if (typeof current === 'number') {
          current = current >= this.treshold
        } else if (current !== false) {
          current = true
        }
        this.changedTrackDecisions++
        this.$set(this.trackDecisions, track.id, !current)
        this.$root.mcdl.setTrackDecision(this.id, track.id, !current)
      },
      commitTrackDecisions () {
        this.changedTrackDecisions = 0
        this.$root.mcdl.getTrackDecisions(this.id).then(decisions => {
          this.trackDecisions = decisions
        })
      }
    }
  }
</script>