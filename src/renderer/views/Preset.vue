<template>
  <div class="preset-detail">
    <preset-summary :id="id"></preset-summary>
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
    computed: {
      preset () {
        return this.$root.mcdl.presets[this.id]
      }
    }
  }
</script>