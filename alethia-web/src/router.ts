import { createRouter, createWebHistory } from 'vue-router'
import PortfolioView from './views/PortfolioView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'portfolio', component: PortfolioView },
  ],
})

export default router
