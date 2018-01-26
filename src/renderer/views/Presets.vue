<template>
    <div>
        <div class="text-center" v-if="!Object.keys(presets).length">
            You don't have any presets yet<br>
            <router-link to="/presets/new">Create your first preset</router-link>
        </div>
        <div class="presets" columns v-else>
            <div class="preset d-flex d-flex-row" v-for="(preset, id) in presets" :key="id">
                <div class="user-picture" :class="{error: users.hasOwnProperty(id) && !users[id]}">
                    <img :src="users[id].pictures.large" v-if="users[id] && users[id].pictures">
                </div>
                <div>
                    <h4>{{preset.username}}</h4>
                    <b-button variant="link" @click="removeId = id">Delete</b-button>
                </div>
            </div>
        </div>
        <b-modal
            title="Delete preset"
            v-if="removeId"
            visible
            @ok="$store.dispatch('deletePreset', removeId)"
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
        removeId: undefined
      }
    },
    computed: {
      presets () { return this.$root.mcdl.presets },
      users () { return this.$root.mcdl.users }
    }
  }
</script>

<style>

</style>