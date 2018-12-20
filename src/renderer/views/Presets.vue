<template>
  <div>
    <div class="text-center" v-if="!Object.keys(presets).length">
      You don't have any presets yet<br>
      <router-link to="/presets/new">Create your first preset</router-link>
    </div>
    <div class="presets" columns v-else>
      <preset-summary
        v-for="id in Object.keys(presets || {})"
        link
        :id="id" :key="id"></preset-summary>
    </div>
  </div>
</template>

<script>
import PresetSummary from '../components/PresetSummary'

export default {
  name: 'presets',
  components: { PresetSummary },
  computed: {
    presets () { return this.$root.mcdl.presets }
  }
}
</script>
