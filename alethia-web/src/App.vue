<template>
  <header class="site-header">
    <nav class="site-tabs" aria-label="Main navigation">
      <RouterLink to="/">Portfolio</RouterLink>
    </nav>
    <div class="header-actions" aria-label="Display preferences">
      <button
        class="language-toggle"
        type="button"
        :aria-label="`Switch website language to ${language === 'en' ? 'German' : 'English'}`"
        @click="toggleLanguage"
      >
        <span :class="{ active: language === 'en' }">EN</span>
        <span :class="{ active: language === 'de' }">DE</span>
      </button>
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
        <span>{{ theme === 'dark' ? (language === 'de' ? 'Dunkel' : 'Dark') : (language === 'de' ? 'Hell' : 'Light') }}</span>
      </button>
    </div>
  </header>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted, provide, ref, watch } from 'vue'

type Theme = 'light' | 'dark'
type Language = 'en' | 'de'

const theme = ref<Theme>('dark')
const language = ref<Language>('en')

const applyTheme = (value: Theme) => {
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
}

onMounted(() => {
  const storedTheme = localStorage.getItem('theme')
  const storedLanguage = localStorage.getItem('language')
  const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

  theme.value = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : preferredTheme
  language.value = storedLanguage === 'de' || storedLanguage === 'en' ? storedLanguage : 'en'
  applyTheme(theme.value)
  document.documentElement.lang = language.value
})

watch(theme, (value) => {
  applyTheme(value)
  localStorage.setItem('theme', value)
})

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

watch(language, (value) => {
  localStorage.setItem('language', value)
  document.documentElement.lang = value
})

provide('language', language)

const toggleLanguage = () => {
  language.value = language.value === 'en' ? 'de' : 'en'
}
</script>
