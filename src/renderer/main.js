import Vue from 'vue'
import VueBootstrap from 'bootstrap-vue'
import axios from 'axios'

import App from './App'
import router from './router'
import Mcdl from './mcdl'

Vue.use(VueBootstrap)
Vue.prototype.$log = function (value) { console.log(value); return value }
if (!process.env.IS_WEB) {
  Vue.use(require('vue-electron'))
  Vue.use(require('./ipc').plugin)
}
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  template: '<App/>',
  data () {
    return {mcdl: new Mcdl()}
  }
}).$mount('#app')
