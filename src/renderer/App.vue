<template>
  <div id="app">
    <b-navbar sticky fixed="top" variant="dark" type="dark">
      <b-navbar-brand to="/"><i class="fa fa-home"></i></b-navbar-brand>
      <b-nav-form right>
        <b-btn :to="{name: 'create_preset'}"><i class="fa fa-plus"></i></b-btn>
      </b-nav-form>
    </b-navbar>
    <div style="height: 0; overflow: visible">
      <tasks variant="secondary" :tasks="$root.mcdl.tasks" :filter="{topic: 'loading'}"/>
      <tasks :tasks="$root.mcdl.tasks" :filter="{topic: 'downloading'}"/>
    </div>
    <router-view class="m-4"></router-view>
  </div>
</template>

<script>
import Vue from 'vue'
import Tasks from './components/Tasks'

Vue.component('tasks', Tasks)

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
