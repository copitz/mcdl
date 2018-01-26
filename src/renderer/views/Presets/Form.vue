<template>
    <b-form @submit.prevent="save()">
        <b-alert :show="!!error" variant="danger">Something went wrong :(</b-alert>
        <h3>{{id ? 'Edit ' + (preset && preset.username) : 'Create preset' }}</h3>
        <hr>
        <b-form-group
            v-for="(el, key) in {username: {label: 'Username', placeholder: 'MixCloud username to download from'}}"
            :key="key"
            :label="el.label"
            :label-for="key"
            :state="states[key]"
            :invalid-feedback="feedbacks[key]"
        >
            <b-form-input
                :id="key"
                v-model="values[key]"
                required
                :disabled="!!id || saving"
                :state="states[key]"
                :placeholder="el.placeholder"
                @blur.native="validate(key)"
            ></b-form-input>
        </b-form-group>

        <b-form-group
            label="Directory"
            label-for="dir"
            :state="states.dir"
            :invalid-feedback="feedbacks.dir"
        >
            <div class="input-group">
                <b-form-input
                    id="username"
                    v-model="values.dir"
                    required
                    placeholder="MixCloud username to download from"
                    :state="states.dir"
                    :disabled="saving"
                ></b-form-input>
                <div class="input-group-append">
                    <button
                        @click.prevent="selectDirectory('dir')"
                        type="button"
                        class="btn btn-secondary"
                        :disabled="saving"
                    >
                        <i class="fa fa-folder-open"></i>
                    </button>
                </div>
            </div>
        </b-form-group>

        <hr>
        <div class="d-flex justify-content-center flex-wrap-reverse">
            <b-button @click="$router.replace('/')" variant="secondary" class="mx-2">Cancel</b-button>
            <b-button type="submit" :disabled="saving" variant="success" class="mx-2">
                <i class="fa fa-circle-o-notch fa-spin" v-if="saving"></i>
                Sav{{ saving ? 'ing' : 'e'}}
            </b-button>
        </div>
    </b-form>
</template>

<script>
  import extend from 'extend'
  const defaults = {
    username: null,
    type: 'mixcloud',
    dir: null,
    split: {},
    playlists: {}
  }
  function states (defaultValue) {
    return Object.keys(defaults).reduce((states, key) => {
      states[key] = defaultValue
      return states
    }, {})
  }
  export default {
    props: {
      id: String
    },
    data () {
      const presets = this.$root.mcdl.presets
      const preset = presets && this.id ? presets[this.id] : undefined
      const values = extend(true, {}, defaults, preset, {id: this.id || null})
      return {
        preset,
        values,
        states: states(),
        saving: false,
        feedbacks: states(''),
        error: undefined
      }
    },
    methods: {
      validate (k) {
        const promises = []
        const keys = k ? [k] : ['username', 'dir']
        let valid = keys.reduce((wasValid, key) => {
          if (!this.values[key]) {
            this.states[key] = false
            this.feedbacks[key] = 'Please enter a valid ' + key
            return false
          }
          this.values[key] = this.values[key].trim()
          let error
          let value = this.values[key]

          if (key === 'dir') {
            error = !this.$ipcs('fs.exists', value) ? 'Does not exist' : (
              !this.$ipcs('fs.isDirectory', value) ? 'Not a directory' : null
            )
          }

          if (key === 'username') {
            if (!this.id && this.$root.mcdl.presets[value]) {
              error = 'Name already in use'
            } else {
              promises.push(this.$ipc('mcdl.drivers.userInfo', this.values.type, value).then(
                (user) => {
                  console.log(user)
                  this.states.username = true
                },
                (error) => {
                  console.log(error)
                  this.feedbacks.username = (error && error.response && error.response.statusCode === 404)
                    ? 'There\'s no user with this username' : 'Error during request'
                  this.states.username = false
                  valid = false
                }
              ))
            }
          }

          if (error) {
            this.feedbacks[key] = error
            this.states[key] = false
            return false
          }
          this.states[key] = true
          return wasValid
        }, true)
        return Promise.all(promises).then(() => valid)
      },
      save () {
        this.states = states()
        this.feedbacks = states('Please enter a valid value')
        this.saving = true
        this.validate().then(
          (valid) => {
            this.saving = false
            if (valid) {
              const preset = extend(true, {}, this.values)
              let id = !this.id || this.preset.username === this.id ? this.values.username : this.id
              if (id !== this.id) {
                for (let i = 1; this.$root.mcdl.presets.hasOwnProperty(id); i++) {
                  id = id.replace(/_[0-9]+$/) + '_' + i
                }
              }
              Promise.resolve(this.$ipcs('mcdl.savePreset', id, preset))
                .then(() => {
                  if (this.id && id !== this.id) {
                    return this.$ipcs('mcdl.deletePreset', this.id)
                  }
                })
                .then(
                  () => {
                    this.$router.replace('/preset/' + id)
                  },
                  (error) => {
                    this.error = error
                  }
                )
            }
          }
        )
      },
      selectDirectory (key) {
        const files = this.$ipcs('electron.dialog.showOpenDialog', {properties: ['openDirectory']})
        this.values[key] = (files && files.length) ? files[0] : undefined
      }
    }
  }
</script>