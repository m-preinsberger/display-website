import { createRouter, createWebHistory } from 'vue-router'
import PortfolioView from './views/PortfolioView.vue'
import VocabView from './views/VocabView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'portfolio', component: PortfolioView },
    { path: '/vocab', name: 'vocab', component: VocabView },
  ],
})

export default router
