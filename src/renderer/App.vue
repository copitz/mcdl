<template>
  <div id="app">
    <b-navbar class="mb-4" sticky fixed="top" variant="dark" type="dark">
      <b-navbar-brand to="/"><i class="fa fa-home"></i></b-navbar-brand>
    </b-navbar>
    <b-container>
      <router-view></router-view>
    </b-container>
  </div>
</template>

<script>
  export default {
    data () {
      return {
      }
    }
  }
</script>

<style lang="sass">
  @import "./assets/scss/style"
</style>
