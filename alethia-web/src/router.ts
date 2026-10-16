import { createRouter, createWebHistory } from 'vue-router'
import PortfolioView from './views/PortfolioView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'portfolio', component: PortfolioView },
    { path: '/crazy-learning-zone', name: 'learning', component: () => import('./views/LearningView.vue') },
  ],
})

export default router
