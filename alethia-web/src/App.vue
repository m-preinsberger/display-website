<template>
  <header class="site-header">
    <nav class="site-tabs" aria-label="Main navigation">
      <RouterLink to="/">Portfolio</RouterLink>
    </nav>
    <button
      class="theme-toggle"
      type="button"
      :aria-pressed="theme === 'dark'"
      :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
      @click="toggleTheme"
    >
      <span class="theme-toggle-track" aria-hidden="true">
        <span class="theme-toggle-thumb"></span>
      </span>
      <span>{{ theme === 'dark' ? 'Dark' : 'Light' }}</span>
    </button>
  </header>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

type Theme = 'light' | 'dark'

const theme = ref<Theme>('dark')

const applyTheme = (value: Theme) => {
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
}

onMounted(() => {
  const storedTheme = localStorage.getItem('theme')
  const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

  theme.value = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : preferredTheme
  applyTheme(theme.value)
})

watch(theme, (value) => {
  applyTheme(value)
  localStorage.setItem('theme', value)
})

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
</script>
