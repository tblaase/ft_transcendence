import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'


import store from '../store/index'


const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/api_test',
    name: 'api_test',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/ApiTestView.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/profile/',
    name: 'me',
    props: {id : "0"},
    component: () => import('../views/ProfileView.vue')
  },
  {
    path: '/profile/:id',
    name: 'profile',
    props: true,
    component: () => import('../views/ProfileView.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue')
  },
  {
    path: '/play',
    name: 'play',
    component: () => import('../views/PlayView.vue')
  }  
]
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  const publicPages = ['/login'];
  const authRequired = !publicPages.includes(to.path);

  if (authRequired && !store.getters.isLogged) {
    return 'login';
  }
})

export default router
