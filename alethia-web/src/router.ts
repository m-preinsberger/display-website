import { createRouter, createWebHistory } from 'vue-router'
import PortfolioView from './views/PortfolioView.vue'
import DeutschMaturaView from './views/DeutschMaturaView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'portfolio', component: PortfolioView },
    { path: '/deutschmatura', name: 'deutschmatura', component: DeutschMaturaView },
  ],
})

export default router
