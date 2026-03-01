<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

type Card = { term: string; def: string }
type Mode = 'cards' | 'quiz' | 'list'
type QuizDirection = 'termToDef' | 'defToTerm'

type StoredDeckPayload = {
  setName: string
  cards: Card[]
  hard: string[]
  seen: string[]
}

type StoredProgressPayload = {
  setName: string
  hard: string[]
  seen: string[]
  quizTotal: number
  quizCorrect: number
  quizDirection: QuizDirection
}

const STORAGE_KEY = 'alethia-private-vocab'
const PROGRESS_COOKIE_KEY = 'alethia_vocab_progress'

const DECKS: Record<string, Card[]> = {
  'Vocab List': [
    { term: 'persuasive', def: 'able to convince' },
    { term: 'proposal', def: 'strong (written) suggestion/offer' },
    { term: 'succinct', def: 'compact, brief, concise' },
    { term: 'contingency', def: 'unforeseen/unpredictable event' },
    { term: 'expenditure', def: 'calculated costs/spending; overheads' },
    { term: 'shortfall', def: 'deficit; failure' },
    { term: 'scope', def: 'range, extent' },
    { term: 'margin', def: 'something allowed/calculated in addition to set limits' },
    { term: 'feasibility study', def: 'assessment of practicality / if something is doable' },
    { term: 'inevitable', def: 'cannot be avoided' },
    { term: 'to shape', def: 'to mould' },
    { term: 'to aspire', def: 'to pursue ambitious goals' },
    { term: 'conduit', def: 'person/organisation/material that can channel something' },
    { term: 'unanimous', def: 'with one voice; without an objection' },
    { term: 'specifications', def: 'pre-set dimensions' },
    { term: 'array', def: 'stack; collection, assortment' },
    { term: 'yield', def: 'gain, output; harvest' },
    { term: 'mesh', def: 'net' },
    { term: 'canopy', def: 'roofing, sunshade' },
    { term: 'contraption', def: 'machine, device' },
    { term: 'to funnel (off)', def: 'to channel, pour, pass on' },
    { term: 'arid', def: 'dry and waterless' },
    { term: 'tethered to', def: 'tied or fixed to' },
    { term: 'safe to eat', def: 'edible' },
    { term: 'safe to drink', def: 'potable' },
  ],
  'Hamlet Words': [
    { term: 'veil', def: 'screen-like covering of the face' },
    { term: 'skip', def: 'trunk, box' },
    { term: 'coffin', def: 'large box containing a dead person' },
    { term: 'to console', def: 'to comfort/support somebody grieving' },
    { term: 'doomed', def: 'destined, condemned' },
    { term: 'apparition', def: 'visible ghost' },
    { term: 'serpent', def: 'snake' },
    { term: 'a lunatic', def: 'mad person' },
    { term: 'tainted', def: 'spoiled, stained, marked' },
    { term: 'rebuke', def: 'harsh criticism' },
    { term: 'a catch', def: 'a hidden problem' },
    { term: 'betrayal', def: 'treachery, disloyalty' },
    { term: 'commotion', def: 'disturbance, stirring, confusion' },
    { term: 'salvation', def: 'being saved' },
    { term: 'wayward', def: 'stubborn, disobedient' },
  ],
}

DECKS['All (combined)'] = [...(DECKS['Vocab List'] ?? []), ...(DECKS['Hamlet Words'] ?? [])]

const mode = ref<Mode>('cards')
const currentSetName = ref('All (combined)')
const searchQuery = ref('')
const currentIndex = ref(0)
const isFlipped = ref(false)
const hard = reactive(new Set<string>())
const seen = reactive(new Set<string>())
const allCards = ref<Card[]>(structuredClone(DECKS[currentSetName.value] ?? []))

const quizDirection = ref<QuizDirection>('termToDef')
const quizAnswered = ref(false)
const quizTotal = ref(0)
const quizCorrect = ref(0)
const quizToast = ref('')
const quiz = ref<{ question: string; correctAnswer: string; answers: string[] } | null>(null)

const jsonBox = ref('')
const jsonToast = ref('')

const setNames = computed(() => Object.keys(DECKS))

const filtered = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return allCards.value.filter((card) => {
    const term = card.term.toLowerCase()
    const def = card.def.toLowerCase()
    const isHard = hard.has(keyOf(card))
    if (query === 'hard') {
      return isHard
    }
    return term.includes(query) || def.includes(query)
  })
})

const currentCard = computed(() => {
  if (filtered.value.length === 0) {
    return null
  }
  const safeIndex = Math.max(0, Math.min(currentIndex.value, filtered.value.length - 1))
  return filtered.value[safeIndex] ?? null
})

const visibleCountLabel = computed(() => `${filtered.value.length}`)
const hardCountLabel = computed(() => `${hard.size}`)
const seenLabel = computed(() => `${seen.size} seen`)
const positionLabel = computed(() => {
  if (!currentCard.value) {
    return '0/0'
  }
  return `${currentIndex.value + 1}/${filtered.value.length}`
})
const quizModeLabel = computed(() =>
  quizDirection.value === 'termToDef' ? 'Term → Definition' : 'Definition → Term',
)
const scoreLabel = computed(() => `${quizCorrect.value}/${quizTotal.value}`)

watch([filtered, currentSetName], () => {
  if (currentIndex.value >= filtered.value.length) {
    currentIndex.value = Math.max(0, filtered.value.length - 1)
  }
})

watch([currentSetName, allCards, searchQuery], () => {
  persistPrivateDeck()
}, { deep: true })

function keyOf(card: Card) {
  return card.term.toLowerCase().trim()
}

function markSeen(card: Card | null) {
  if (!card) {
    return
  }
  seen.add(keyOf(card))
  persistLearningProgress()
}

function loadSet(name: string) {
  currentSetName.value = name
  allCards.value = structuredClone(DECKS[name] ?? [])
  currentIndex.value = 0
  isFlipped.value = false
  markSeen(currentCard.value ?? null)
  startQuiz()
}

function goNext() {
  if (filtered.value.length === 0) {
    return
  }
  currentIndex.value = (currentIndex.value + 1) % filtered.value.length
  isFlipped.value = false
  markSeen(currentCard.value ?? null)
}

function goPrev() {
  if (filtered.value.length === 0) {
    return
  }
  currentIndex.value = (currentIndex.value - 1 + filtered.value.length) % filtered.value.length
  isFlipped.value = false
  markSeen(currentCard.value ?? null)
}

function flipCard() {
  if (!currentCard.value) {
    return
  }
  isFlipped.value = !isFlipped.value
}

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const left = items[index]
    const right = items[randomIndex]
    if (left === undefined || right === undefined) {
      continue
    }
    items[index] = right
    items[randomIndex] = left
  }
}

function shuffleDeck() {
  const clone = [...allCards.value]
  shuffleInPlace(clone)
  allCards.value = clone
  currentIndex.value = 0
  isFlipped.value = false
}

function resetAll() {
  searchQuery.value = ''
  currentIndex.value = 0
  isFlipped.value = false
  hard.clear()
  seen.clear()
  allCards.value = structuredClone(DECKS[currentSetName.value] ?? [])
  quizCorrect.value = 0
  quizTotal.value = 0
  startQuiz()
  persistLearningProgress()
}

function toggleHard() {
  if (!currentCard.value) {
    return
  }
  const cardKey = keyOf(currentCard.value)
  if (hard.has(cardKey)) {
    hard.delete(cardKey)
  } else {
    hard.add(cardKey)
  }
  persistLearningProgress()
}

function switchMode(nextMode: Mode) {
  mode.value = nextMode
  if (nextMode === 'quiz') {
    startQuiz()
  }
}

function quizBank() {
  if (filtered.value.length >= 4) {
    return filtered.value
  }
  return allCards.value
}

function startQuiz() {
  quizAnswered.value = false
  quizToast.value = ''

  const bank = quizBank()
  if (bank.length < 2) {
    quiz.value = null
    return
  }

  const correctCard = bank[Math.floor(Math.random() * bank.length)]
  if (!correctCard) {
    quiz.value = null
    return
  }
  const correctKey = keyOf(correctCard)

  const distractors = [...bank].filter((card) => keyOf(card) !== correctKey)
  shuffleInPlace(distractors)

  const answerText =
    quizDirection.value === 'termToDef' ? correctCard.def : correctCard.term

  const possibleAnswers = [
    answerText,
    ...distractors.slice(0, 3).map((card) =>
      quizDirection.value === 'termToDef' ? card.def : card.term,
    ),
  ]

  shuffleInPlace(possibleAnswers)
  quiz.value = {
    question: quizDirection.value === 'termToDef' ? correctCard.term : correctCard.def,
    correctAnswer: answerText,
    answers: possibleAnswers,
  }
}

function answerQuiz(answer: string) {
  if (!quiz.value || quizAnswered.value) {
    return
  }
  quizAnswered.value = true
  quizTotal.value += 1

  const isCorrect = answer === quiz.value.correctAnswer
  if (isCorrect) {
    quizCorrect.value += 1
    quizToast.value = 'Correct.'
  } else {
    quizToast.value = 'Wrong. Correct answer highlighted.'
  }

  persistLearningProgress()
}

function isAnswerCorrect(answer: string) {
  return quizAnswered.value && quiz.value?.correctAnswer === answer
}

function isAnswerWrong(answer: string) {
  return quizAnswered.value && quiz.value?.correctAnswer !== answer
}

function skipQuizQuestion() {
  quizAnswered.value = true
  quizToast.value = 'Skipped.'
}

function switchQuizDirection() {
  quizDirection.value = quizDirection.value === 'termToDef' ? 'defToTerm' : 'termToDef'
  persistLearningProgress()
  startQuiz()
}

function showJsonToast(message: string) {
  jsonToast.value = message
  window.setTimeout(() => {
    jsonToast.value = ''
  }, 2600)
}

function exportJson() {
  const payload: StoredDeckPayload = {
    setName: currentSetName.value,
    cards: allCards.value,
    hard: Array.from(hard),
    seen: Array.from(seen),
  }
  jsonBox.value = JSON.stringify(payload, null, 2)
  showJsonToast('Exported current vocab deck.')
}

function importJson() {
  try {
    const payload = JSON.parse(jsonBox.value || '{}') as Partial<StoredDeckPayload>
    if (!payload || !Array.isArray(payload.cards)) {
      throw new Error('Expected an object with cards array.')
    }

    const cleaned = payload.cards
      .map((card) => ({ term: String(card.term ?? '').trim(), def: String(card.def ?? '').trim() }))
      .filter((card) => card.term.length > 0 && card.def.length > 0)

    if (cleaned.length === 0) {
      throw new Error('No valid cards found.')
    }

    const name = String(payload.setName || 'Imported').trim() || 'Imported'
    DECKS[name] = cleaned
    if (!setNames.value.includes('All (combined)')) {
      DECKS['All (combined)'] = [...cleaned]
    }

    hard.clear()
    seen.clear()
    for (const cardKey of payload.hard ?? []) {
      hard.add(String(cardKey))
    }
    for (const cardKey of payload.seen ?? []) {
      seen.add(String(cardKey))
    }

    loadSet(name)
    showJsonToast(`Imported set: ${name} (${cleaned.length} cards).`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown import error.'
    showJsonToast(`Import failed: ${message}`)
  }
}

function capCookieList(list: string[], limit: number) {
  if (list.length <= limit) {
    return list
  }
  return list.slice(0, limit)
}

function writeCookie(name: string, value: string, maxAgeDays: number) {
  const maxAgeSeconds = Math.floor(maxAgeDays * 24 * 60 * 60)
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`
}

function readCookie(name: string) {
  const encodedName = `${name}=`
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.slice(encodedName.length))
    }
  }
  return null
}

function persistLearningProgress() {
  const payload: StoredProgressPayload = {
    setName: currentSetName.value,
    hard: capCookieList(Array.from(hard), 100),
    seen: capCookieList(Array.from(seen), 160),
    quizTotal: quizTotal.value,
    quizCorrect: quizCorrect.value,
    quizDirection: quizDirection.value,
  }

  writeCookie(PROGRESS_COOKIE_KEY, JSON.stringify(payload), 365)
}

function hydrateLearningProgress() {
  const raw = readCookie(PROGRESS_COOKIE_KEY)
  if (!raw) {
    return
  }

  try {
    const payload = JSON.parse(raw) as Partial<StoredProgressPayload>

    const possibleSetName = String(payload.setName ?? '').trim()
    if (possibleSetName && DECKS[possibleSetName]) {
      currentSetName.value = possibleSetName
      allCards.value = structuredClone(DECKS[possibleSetName])
    }

    hard.clear()
    seen.clear()
    for (const cardKey of payload.hard ?? []) {
      hard.add(String(cardKey))
    }
    for (const cardKey of payload.seen ?? []) {
      seen.add(String(cardKey))
    }

    quizTotal.value = Number.isFinite(payload.quizTotal) ? Number(payload.quizTotal) : 0
    quizCorrect.value = Number.isFinite(payload.quizCorrect) ? Number(payload.quizCorrect) : 0
    if (payload.quizDirection === 'termToDef' || payload.quizDirection === 'defToTerm') {
      quizDirection.value = payload.quizDirection
    }
  } catch {
    writeCookie(PROGRESS_COOKIE_KEY, '', -1)
  }
}

function persistPrivateDeck() {
  const payload: StoredDeckPayload = {
    setName: currentSetName.value,
    cards: allCards.value,
    hard: [],
    seen: [],
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function hydratePrivateData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return
  }

  try {
    const payload = JSON.parse(raw) as StoredDeckPayload
    if (!payload || !Array.isArray(payload.cards) || payload.cards.length === 0) {
      return
    }

    const setName = payload.setName?.trim() || 'Private Vocab'
    DECKS[setName] = payload.cards
    currentSetName.value = setName
    allCards.value = structuredClone(payload.cards)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

hydratePrivateData()
hydrateLearningProgress()
markSeen(currentCard.value ?? null)
startQuiz()
</script>

<template>
  <main class="vocab-page">
    <header class="vocab-header">
      <div class="header-left">
        <p class="eyebrow">Private Study Space</p>
        <h1>Vocabulary Trainer</h1>
      </div>
      <div class="header-actions">
        <RouterLink class="btn ghost" to="/">Back to Portfolio</RouterLink>
      </div>
    </header>

    <section class="toolbar panel">
      <div class="input-wrap">
        <label for="set-select">Set</label>
        <select id="set-select" v-model="currentSetName" @change="loadSet(currentSetName)">
          <option v-for="name in setNames" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>
      <div class="input-wrap grow">
        <label for="search-input">Search</label>
        <input id="search-input" v-model="searchQuery" type="text" placeholder="Type term, definition, or hard" />
      </div>
      <button class="btn soft" type="button" @click="shuffleDeck">Shuffle</button>
      <button class="btn soft" type="button" @click="resetAll">Reset</button>
    </section>

    <section class="layout">
      <article class="panel main-panel">
        <div class="mode-tabs">
          <button class="tab" :class="{ active: mode === 'cards' }" type="button" @click="switchMode('cards')">Flashcards</button>
          <button class="tab" :class="{ active: mode === 'quiz' }" type="button" @click="switchMode('quiz')">Quiz</button>
          <button class="tab" :class="{ active: mode === 'list' }" type="button" @click="switchMode('list')">List</button>
        </div>

        <div v-if="mode === 'cards'" class="cards-view">
          <button class="card-stage" type="button" @click="flipCard">
            <div v-if="currentCard" class="card-stage-content">
              <p class="card-front">{{ isFlipped ? currentCard.def : currentCard.term }}</p>
            </div>
            <div v-else class="card-stage-content">
              <p class="card-front">No cards found.</p>
              <p class="hint">Try another set or clear search.</p>
            </div>
            <p class="hint">Click to flip</p>
          </button>

          <div class="nav-row">
            <button class="btn soft" type="button" @click="goPrev">Prev</button>
            <button class="btn primary" type="button" @click="flipCard">Flip</button>
            <button class="btn soft" type="button" @click="goNext">Next</button>
          </div>

          <div class="stats-row">
            <span class="chip">Card {{ positionLabel }}</span>
            <span class="chip">Progress {{ seenLabel }}</span>
          </div>
        </div>

        <div v-else-if="mode === 'quiz'" class="quiz-view">
          <div class="quiz-box">
            <p class="quiz-question" v-if="quiz">{{ quiz.question }}</p>
            <p class="quiz-question" v-else>Not enough cards for quiz mode yet.</p>

            <div class="quiz-choices" v-if="quiz">
              <button
                v-for="answer in quiz.answers"
                :key="answer"
                class="choice"
                :class="{ correct: isAnswerCorrect(answer), wrong: isAnswerWrong(answer) }"
                type="button"
                @click="answerQuiz(answer)"
                :disabled="quizAnswered"
              >
                {{ answer }}
              </button>
            </div>

            <p v-if="quizToast" class="toast">{{ quizToast }}</p>
          </div>

          <div class="nav-row">
            <button class="btn soft" type="button" @click="skipQuizQuestion">Skip</button>
            <button class="btn primary" type="button" @click="startQuiz">Next question</button>
          </div>

          <div class="stats-row">
            <span class="chip">Score {{ scoreLabel }}</span>
            <span class="chip">Mode {{ quizModeLabel }}</span>
            <button class="btn soft" type="button" @click="switchQuizDirection">Switch direction</button>
          </div>
        </div>

        <div v-else class="list-view">
          <div v-if="filtered.length === 0" class="empty">No matching cards.</div>
          <button
            v-for="(card, index) in filtered"
            :key="`${card.term}-${index}`"
            class="list-item"
            type="button"
            @click="currentIndex = index; isFlipped = false; switchMode('cards')"
          >
            <div>
              <p class="term">{{ card.term }}</p>
              <p class="meta">#{{ index + 1 }} <span v-if="hard.has(keyOf(card))">• hard</span></p>
            </div>
            <p class="definition">{{ card.def }}</p>
          </button>
        </div>
      </article>

      <aside class="panel side-panel">
        <div class="side-head">
          <div>
            <p class="section-title">Filtered deck</p>
            <p class="section-subtitle">Learning progress is saved in subdomain cookies</p>
          </div>
          <button
            class="btn"
            :class="currentCard && hard.has(keyOf(currentCard)) ? 'primary' : 'danger'"
            type="button"
            @click="toggleHard"
            :disabled="!currentCard"
          >
            {{ currentCard && hard.has(keyOf(currentCard)) ? 'Hard ✓' : 'Hard' }}
          </button>
        </div>

        <div class="stats-row">
          <span class="chip">Cards {{ visibleCountLabel }}</span>
          <span class="chip">Hard {{ hardCountLabel }}</span>
        </div>

        <div class="tips">
          <p>Tips:</p>
          <ul>
            <li>Search hard to focus difficult words.</li>
            <li>Use Quiz mode for fast recall checks.</li>
            <li>Export JSON to backup your private deck.</li>
          </ul>
        </div>

        <div class="json-box">
          <p class="section-title">Import / Export</p>
          <textarea v-model="jsonBox" placeholder="Paste a JSON payload with cards here"></textarea>
          <div class="nav-row">
            <button class="btn soft" type="button" @click="exportJson">Export JSON</button>
            <button class="btn primary" type="button" @click="importJson">Import JSON</button>
          </div>
          <p v-if="jsonToast" class="toast">{{ jsonToast }}</p>
        </div>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.vocab-page {
  width: 100%;
  margin: 0;
  padding: 2.2rem clamp(1rem, 3.2vw, 3rem) 4rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.vocab-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  margin-bottom: 1rem;
}

.vocab-header h1 {
  font-size: clamp(1.8rem, 4.2vw, 2.8rem);
}

.eyebrow {
  margin: 0;
  color: #8eb8ff;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-size: 0.82rem;
}

.panel {
  background: linear-gradient(160deg, rgba(26, 35, 59, 0.75), rgba(12, 17, 30, 0.85));
  border: 1px solid rgba(120, 148, 214, 0.2);
  border-radius: 1rem;
}

.toolbar {
  padding: 0.9rem;
  display: flex;
  gap: 0.7rem;
  align-items: end;
  flex-wrap: wrap;
}

.layout {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 1rem;
  flex: 1;
  align-items: stretch;
}

.main-panel,
.side-panel {
  padding: 1rem;
  height: 100%;
}

.input-wrap {
  display: grid;
  gap: 0.32rem;
  min-width: 170px;
}

.input-wrap.grow {
  flex: 1;
}

label {
  color: #afbdd9;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

input,
select,
textarea,
button {
  font: inherit;
}

input,
select {
  border-radius: 0.68rem;
  border: 1px solid rgba(120, 148, 214, 0.25);
  background: rgba(16, 23, 40, 0.8);
  color: #e8edf7;
  padding: 0.62rem 0.68rem;
}

.mode-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.95rem;
}

.tab {
  border: 1px solid rgba(120, 148, 214, 0.25);
  background: rgba(16, 23, 40, 0.6);
  color: #d6e1f7;
  border-radius: 0.7rem;
  padding: 0.56rem 0.82rem;
  cursor: pointer;
}

.tab.active {
  border-color: rgba(94, 234, 212, 0.45);
  background: rgba(94, 234, 212, 0.12);
}

.card-stage {
  width: 100%;
  min-height: 310px;
  border: 1px solid rgba(120, 148, 214, 0.25);
  border-radius: 1rem;
  background:
    radial-gradient(circle at 15% 8%, rgba(96, 165, 250, 0.2), transparent 42%),
    radial-gradient(circle at 84% 0%, rgba(94, 234, 212, 0.16), transparent 40%),
    rgba(16, 23, 40, 0.75);
  color: #eff4ff;
  cursor: pointer;
  padding: 1.1rem;
  display: grid;
  place-items: center;
  gap: 0.8rem;
}

.card-stage-content {
  text-align: center;
}

.card-front {
  margin: 0;
  font-size: clamp(1.3rem, 3.2vw, 2rem);
  font-weight: 700;
}

.card-back {
  margin: 0.78rem 0 0;
  color: #c2cce0;
  font-size: clamp(1rem, 2.2vw, 1.2rem);
}

.hint {
  margin: 0;
  color: #9aacd1;
  font-size: 0.82rem;
}

.nav-row,
.stats-row {
  margin-top: 0.8rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.btn {
  border: 1px solid transparent;
  border-radius: 0.68rem;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
  color: #e8edf7;
  background: rgba(16, 23, 40, 0.8);
}

.btn.primary {
  border-color: rgba(94, 234, 212, 0.45);
  background: rgba(94, 234, 212, 0.14);
}

.btn.soft,
.btn.ghost {
  border-color: rgba(120, 148, 214, 0.25);
}

.btn.danger {
  border-color: rgba(251, 113, 133, 0.5);
  background: rgba(251, 113, 133, 0.14);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chip {
  border: 1px solid rgba(120, 148, 214, 0.25);
  padding: 0.42rem 0.64rem;
  border-radius: 999px;
  background: rgba(16, 23, 40, 0.65);
  color: #d8e2f7;
  font-size: 0.84rem;
}

.quiz-box {
  border: 1px solid rgba(120, 148, 214, 0.25);
  border-radius: 0.85rem;
  background: rgba(16, 23, 40, 0.65);
  padding: 0.9rem;
}

.quiz-question {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 700;
}

.quiz-choices {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.55rem;
}

.choice {
  text-align: left;
  border: 1px solid rgba(120, 148, 214, 0.25);
  background: rgba(16, 23, 40, 0.72);
  border-radius: 0.72rem;
  color: #deebff;
  padding: 0.62rem;
}

.choice.correct {
  border-color: rgba(52, 211, 153, 0.6);
  background: rgba(52, 211, 153, 0.13);
}

.choice.wrong {
  border-color: rgba(251, 113, 133, 0.6);
  background: rgba(251, 113, 133, 0.13);
}

.list-view {
  display: grid;
  gap: 0.55rem;
  max-height: 560px;
  overflow: auto;
}

.list-item {
  border: 1px solid rgba(120, 148, 214, 0.25);
  background: rgba(16, 23, 40, 0.65);
  color: inherit;
  text-align: left;
  border-radius: 0.75rem;
  padding: 0.72rem;
  display: grid;
  gap: 0.35rem;
}

.list-item .term {
  margin: 0;
  font-weight: 700;
}

.list-item .meta,
.section-subtitle,
.toast,
.tips,
.definition,
.empty {
  margin: 0;
  color: #b9c7e4;
}

.side-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 0.6rem;
}

.section-title {
  margin: 0;
  font-weight: 700;
}

.tips ul {
  margin: 0.42rem 0 0;
  padding-left: 1rem;
}

.tips li + li {
  margin-top: 0.3rem;
}

.json-box {
  border-top: 1px solid rgba(120, 148, 214, 0.2);
  margin-top: 0.85rem;
  padding-top: 0.85rem;
}

textarea {
  width: 100%;
  min-height: 130px;
  margin-top: 0.48rem;
  padding: 0.68rem;
  resize: vertical;
  border-radius: 0.74rem;
  border: 1px solid rgba(120, 148, 214, 0.25);
  background: rgba(16, 23, 40, 0.85);
  color: #dce8ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.82rem;
}

@media (max-width: 980px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
