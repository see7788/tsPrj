import Vue from "vue";
import App from "./vue/main.vue";
import VueRouter from "vue-router";
import Vuex from "vuex";
Vue.use(VueRouter);
Vue.use(Vuex);
Vue.config.productionTip = false;
const store = new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {}
});
const router = new VueRouter({
  // routes: [
  //   {
  //     path: "/",
  //     name: "Home",
  //     component: () => import(/* webpackChunkName: "about" */ "../views/Home.vue")
  //   },
  //   {
  //     path: "/about",
  //     name: "About",
  //     // route level code-splitting
  //     // this generates a separate chunk (about.[hash].js) for this route
  //     // which is lazy-loaded when the route is visited.
  //     component: () => import(/* webpackChunkName: "about" */ "../views/About.vue")
  //   }
  // ]
});
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
