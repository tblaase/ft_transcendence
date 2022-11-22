import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'


import store from '../store/index'


const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'me',
    props: {id : "0"},
    component: () => import('../views/ProfileView.vue')
  },
  {
    path: '/api_test',
    name: 'api_test',
    component: () => import('../views/ApiTestView.vue')
  },
  {
    path: '/login',
    name: 'login',
    props: {tfa : false},
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/login/tfa',
    name: 'tfa',
    props: {tfa : true},
    component: () => import('../views/LoginView.vue')
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
  },
  {
    path: '/scoreboard',
    name: 'scoreboard',
    component: () => import('../views/Scoreboard.vue')
  },
  {
    path: '/chat',
    name: 'Chats',
    component: () => import('../views/Chats.vue')
  }    
]
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  const publicPages = ['/login', '/login/tfa'];
  const authRequired = !publicPages.includes(to.path);
  if (authRequired && store.state.user == null) {
    await store.dispatch('validateUser')
    if (store.state.user == null)
      return '/login';
  }
})

export default router
