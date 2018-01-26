import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/presets'
    },
    {
      path: '/presets',
      name: 'presets',
      component: require('@/views/Presets').default
    },
    {
      path: '/presets/new',
      name: 'create_preset',
      component: require('@/views/Presets/Form').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
