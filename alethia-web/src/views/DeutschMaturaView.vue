<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

type TextType = {
  id: string
  title: string
  goal: string
  wordCount: string
  tone: string
  structure: string[]
  watch: string[]
  memory: string
  quiz: {
    question: string
    options: string[]
    answer: string
  }
}

const STORAGE_KEY = 'deutschmatura-learning-path-progress'

const textTypes: TextType[] = [
  {
    id: 'zusammenfassung',
    title: 'Zusammenfassung',
    goal: 'Ausgangstexte neutral, gekuerzt und sachlich wiedergeben.',
    wordCount: '270-330 Woerter',
    tone: 'neutral, sachlich, Praesens',
    structure: ['Einleitung mit Textdaten', 'Hauptaussagen logisch ordnen', 'Kein eigener Kommentar'],
    watch: ['Keine Bewertung', 'Keine eigene Meinung', 'Nicht zu viele Details', 'Keine langen Zitate'],
    memory: 'neutral kuerzen',
    quiz: {
      question: 'Was ist bei einer Zusammenfassung tabu?',
      options: ['Eigene Meinung', 'Praesens', 'Textsorte und Titel nennen'],
      answer: 'Eigene Meinung',
    },
  },
  {
    id: 'textanalyse',
    title: 'Textanalyse',
    goal: 'Nicht-literarische Texte nach Aufbau, Sprache, Argumentation, Intention und Wirkung untersuchen.',
    wordCount: '405-495 oder 540-660 Woerter',
    tone: 'sachlich, analytisch, belegorientiert',
    structure: ['Textdaten und Thema', 'Inhalt, Aufbau und Argumentation', 'Sprache, Stil, Zielgruppe und Intention', 'Analyseergebnis'],
    watch: ['Nicht nur nacherzaehlen', 'Keine persoenliche Meinung', 'Fachbegriffe verwenden', 'Mit Textstellen belegen'],
    memory: 'sachlich untersuchen',
    quiz: {
      question: 'Welche Textsorte bleibt beim analytisch Feststellbaren?',
      options: ['Textanalyse', 'Textinterpretation', 'Kommentar'],
      answer: 'Textanalyse',
    },
  },
  {
    id: 'textinterpretation',
    title: 'Textinterpretation',
    goal: 'Literarische Texte deuten und die Deutung aus Inhalt, Sprache und Form ableiten.',
    wordCount: '540-660 Woerter',
    tone: 'deutend, textnah, fachsprachlich',
    structure: ['Textdaten und Thema', 'Kurze Inhaltsangabe', 'Analyse von Sprache, Form und Motiven', 'Interpretationshypothese', 'Zentrales Ergebnis'],
    watch: ['Nicht nur nacherzaehlen', 'Jede Deutung begruenden', 'Fachbegriffe einsetzen', 'Zitate korrekt kennzeichnen'],
    memory: 'literarisch deuten',
    quiz: {
      question: 'Was braucht jede gute Interpretation?',
      options: ['Textbelege fuer die Deutung', 'Moeglichst viele private Eindruecke', 'Nur eine lange Inhaltsangabe'],
      answer: 'Textbelege fuer die Deutung',
    },
  },
  {
    id: 'leserbrief',
    title: 'Leserbrief',
    goal: 'Persoenlich und sachlich auf einen veroeffentlichten Beitrag reagieren.',
    wordCount: '270-330 Woerter',
    tone: 'persoenlich, knapp, adressatenbezogen',
    structure: ['Anrede', 'Bezug auf den Artikel', 'Eigene Meinung mit Argumenten', 'Forderung oder Appell', 'Grussformel'],
    watch: ['Klarer Bezug zur Textbeilage', 'Nicht ausschweifen', 'Sachlich bleiben', 'Keine Beleidigungen'],
    memory: 'persoenlich reagieren',
    quiz: {
      question: 'An wen richtet sich ein Leserbrief typischerweise?',
      options: ['Redaktion und Leserschaft', 'Nur an die Prueferin', 'An eine literarische Figur'],
      answer: 'Redaktion und Leserschaft',
    },
  },
  {
    id: 'kommentar',
    title: 'Kommentar',
    goal: 'Zu einem relevanten Thema pointiert Stellung nehmen und Meinungsbildung anregen.',
    wordCount: '270-330, 405-495 oder 540-660 Woerter',
    tone: 'journalistisch, pointiert, klar positioniert',
    structure: ['Pointierte Ueberschrift', 'Aktueller Einstieg', 'Position mit Argumenten und Beispielen', 'Gegenargumente', 'Pointe oder Appell'],
    watch: ['Eigene Meinung klar zeigen', 'Nicht wie eine Erörterung schreiben', 'Kein reines Zusammenfassen', 'Ich eher sparsam verwenden'],
    memory: 'pointiert Meinung bilden',
    quiz: {
      question: 'Was unterscheidet den Kommentar besonders?',
      options: ['Pointierte Haltung', 'Vollstaendige Neutralitaet', 'Keine Ueberschrift'],
      answer: 'Pointierte Haltung',
    },
  },
  {
    id: 'eroerterung',
    title: 'Eroerterung',
    goal: 'Ein strittiges Thema mehrperspektivisch behandeln und begruendet abwaegen.',
    wordCount: '405-495 oder 540-660 Woerter',
    tone: 'sachlich, strukturiert, argumentierend',
    structure: ['Thema oder Problemfrage', 'Pro- und Contra-Argumente', 'Eigene Position', 'Abwaegung und Ausblick'],
    watch: ['Argumente klar strukturieren', 'Gegenpositionen einbauen', 'Textbeilage verwenden', 'Meinung begruenden'],
    memory: 'ausgewogen diskutieren',
    quiz: {
      question: 'Was gehoert unbedingt in eine Eroerterung?',
      options: ['Begruendete Argumente', 'Nur ein Appell', 'Nur Textdaten ohne Position'],
      answer: 'Begruendete Argumente',
    },
  },
  {
    id: 'meinungsrede',
    title: 'Meinungsrede',
    goal: 'Ein Publikum mit Argumenten und rhetorischen Mitteln von einer Position ueberzeugen.',
    wordCount: '405-495 oder 540-660 Woerter',
    tone: 'wirkungsvoll, direkt, redeartig',
    structure: ['Anrede', 'Anlass und Aufmerksamkeit', 'Position, Argumente und Beispiele', 'Gegenargumente', 'Appell und starker Schlusssatz'],
    watch: ['Publikum direkt ansprechen', 'Rhetorische Fragen nutzen', 'Klarer Standpunkt', 'Nicht wie normale Eroerterung schreiben'],
    memory: 'Publikum ueberzeugen',
    quiz: {
      question: 'Welches Mittel passt besonders zur Meinungsrede?',
      options: ['Direkte Publikumsansprache', 'Neutraler Berichtstil', 'Keine Schlusswirkung'],
      answer: 'Direkte Publikumsansprache',
    },
  },
]

const completed = reactive(new Set<string>())
const firstTextType = textTypes[0] as TextType
const selectedId = ref(firstTextType.id)
const quizAnswer = ref('')
const wordTarget = ref(450)
const plannedTexts = ref(2)

const selected = computed<TextType>(() => textTypes.find((item) => item.id === selectedId.value) ?? firstTextType)
const completedCount = computed(() => completed.size)
const progressPercent = computed(() => Math.round((completed.size / textTypes.length) * 100))
const remainingWords = computed(() => {
  const totalMin = 810
  const totalMax = 990
  const first = Math.max(0, Number(wordTarget.value) || 0)
  return {
    min: Math.max(0, totalMin - first),
    max: Math.max(0, totalMax - first),
  }
})
const quizState = computed(() => {
  if (!quizAnswer.value) {
    return ''
  }
  return quizAnswer.value === selected.value.quiz.answer ? 'correct' : 'wrong'
})

watch(completed, saveProgress, { deep: true })

function toggleDone(id: string) {
  if (completed.has(id)) {
    completed.delete(id)
  } else {
    completed.add(id)
  }
}

function chooseTextType(id: string) {
  selectedId.value = id
  quizAnswer.value = ''
}

function answer(option: string) {
  quizAnswer.value = option
  if (option === selected.value.quiz.answer) {
    completed.add(selected.value.id)
  }
}

function resetProgress() {
  completed.clear()
  quizAnswer.value = ''
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed)))
}

function hydrateProgress() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return
  }

  try {
    const stored = JSON.parse(raw) as string[]
    completed.clear()
    for (const id of stored) {
      if (textTypes.some((item) => item.id === id)) {
        completed.add(id)
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

hydrateProgress()
</script>

<template>
  <main class="matura-page">
    <header class="matura-hero">
      <div>
        <p class="eyebrow">HTL-/BHS-Deutschmatura</p>
        <h1>Interaktiver Lernpfad fuer die 7 Textsorten</h1>
        <p class="lead">
          Trainiere Ziel, Aufbau, Stolperfallen und Wortumfang. Dein Fortschritt bleibt lokal im Browser gespeichert.
        </p>
      </div>
      <aside class="progress-panel">
        <p class="progress-number">{{ progressPercent }}%</p>
        <p>{{ completedCount }} von {{ textTypes.length }} Textsorten erledigt</p>
        <div class="progress-track" aria-hidden="true">
          <span :style="{ width: `${progressPercent}%` }"></span>
        </div>
        <button class="btn soft" type="button" @click="resetProgress">Fortschritt zuruecksetzen</button>
      </aside>
    </header>

    <section class="exam-rule">
      <strong>Pruefungsregel:</strong>
      Zwei Texte, insgesamt 900 Woerter +/- 10 %. Spezifische Werkkenntnis oder ein Literaturkanon wird nicht vorausgesetzt.
    </section>

    <section class="learning-layout">
      <aside class="path-panel">
        <button
          v-for="(item, index) in textTypes"
          :key="item.id"
          class="path-step"
          :class="{ active: selectedId === item.id, done: completed.has(item.id) }"
          type="button"
          @click="chooseTextType(item.id)"
        >
          <span>{{ index + 1 }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <small>{{ item.memory }}</small>
          </div>
        </button>
      </aside>

      <article v-if="selected" class="detail-panel">
        <div class="detail-head">
          <div>
            <p class="eyebrow">Lernstation</p>
            <h2>{{ selected.title }}</h2>
          </div>
          <button class="btn primary" type="button" @click="toggleDone(selected.id)">
            {{ completed.has(selected.id) ? 'Erledigt' : 'Als erledigt markieren' }}
          </button>
        </div>

        <div class="focus-grid">
          <section>
            <h3>Ziel</h3>
            <p>{{ selected.goal }}</p>
          </section>
          <section>
            <h3>Wortumfang</h3>
            <p>{{ selected.wordCount }}</p>
          </section>
          <section>
            <h3>Stil</h3>
            <p>{{ selected.tone }}</p>
          </section>
        </div>

        <div class="study-grid">
          <section>
            <h3>Aufbau</h3>
            <ol>
              <li v-for="step in selected.structure" :key="step">{{ step }}</li>
            </ol>
          </section>
          <section>
            <h3>Aufpassen</h3>
            <ul>
              <li v-for="warning in selected.watch" :key="warning">{{ warning }}</li>
            </ul>
          </section>
        </div>

        <section class="quiz-panel">
          <h3>Mini-Check</h3>
          <p>{{ selected.quiz.question }}</p>
          <div class="answer-grid">
            <button
              v-for="option in selected.quiz.options"
              :key="option"
              class="answer"
              :class="{
                correct: quizAnswer && option === selected.quiz.answer,
                wrong: quizAnswer === option && option !== selected.quiz.answer,
              }"
              type="button"
              @click="answer(option)"
            >
              {{ option }}
            </button>
          </div>
          <p v-if="quizState === 'correct'" class="feedback good">Richtig. Diese Station ist erledigt.</p>
          <p v-else-if="quizState === 'wrong'" class="feedback bad">Noch einmal pruefen: Die richtige Antwort ist markiert.</p>
        </section>
      </article>
    </section>

    <section class="tools-panel">
      <div>
        <h2>Wortzahl-Planer</h2>
        <p>Nutze ihn, wenn du einen der zwei Maturatexte planst.</p>
      </div>
      <label>
        Geplante Wortzahl fuer Text 1
        <input v-model.number="wordTarget" type="number" min="0" max="990" step="10" />
      </label>
      <label>
        Anzahl Texte
        <input v-model.number="plannedTexts" type="number" min="1" max="2" />
      </label>
      <p v-if="plannedTexts === 2" class="word-result">
        Fuer Text 2 bleiben ca. {{ remainingWords.min }}-{{ remainingWords.max }} Woerter im erlaubten Gesamtbereich.
      </p>
      <p v-else class="word-result">Gesamtbereich: 810-990 Woerter.</p>
    </section>

    <footer class="source-row">
      <a href="https://www.bmb.gv.at/Themen/schule/schulpraxis/zentralmatura/srdp_ahs/klausurpruefungen/lf_sa_ms/dt_vgs.html" target="_blank" rel="noreferrer">
        BMB/BMBWF
      </a>
      <a href="https://www.matura.gv.at/index.php?eID=dumpFile&f=4525&t=f&token=950c7f2b86f0ebc3459c5f0aa0e04013ab99c572" target="_blank" rel="noreferrer">
        Textsortenkatalog
      </a>
      <a href="https://www.matura.gv.at/index.php?eID=dumpFile&f=4841&t=f&token=c757edec822756f93c143afc9f25741ddee32048" target="_blank" rel="noreferrer">
        Beurteilungsraster
      </a>
    </footer>
  </main>
</template>

<style scoped>
.matura-page {
  width: min(1180px, 92vw);
  margin: 0 auto;
  padding: 2.2rem 0 5rem;
}

.matura-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.7fr);
  gap: 1rem;
  align-items: stretch;
  margin-bottom: 1rem;
}

.matura-hero h1 {
  max-width: 20ch;
}

.progress-panel,
.exam-rule,
.path-panel,
.detail-panel,
.tools-panel {
  background: linear-gradient(160deg, rgba(26, 35, 59, 0.75), rgba(12, 17, 30, 0.85));
  border: 1px solid rgba(120, 148, 214, 0.2);
  border-radius: 1rem;
}

.progress-panel {
  padding: 1.1rem;
  display: grid;
  align-content: center;
  gap: 0.75rem;
}

.progress-number {
  color: #9ec0ff;
  font-size: 2.2rem;
  font-weight: 800;
}

.progress-track {
  height: 0.7rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(120, 148, 214, 0.18);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #7dd3fc, #5eead4);
}

.exam-rule {
  padding: 0.9rem 1rem;
  margin-bottom: 1rem;
  color: #d9e4fb;
}

.learning-layout {
  display: grid;
  grid-template-columns: minmax(240px, 0.7fr) minmax(0, 1.6fr);
  gap: 1rem;
  align-items: start;
}

.path-panel {
  padding: 0.75rem;
  display: grid;
  gap: 0.55rem;
}

.path-step {
  width: 100%;
  border: 1px solid rgba(120, 148, 214, 0.22);
  border-radius: 0.75rem;
  background: rgba(16, 23, 40, 0.65);
  color: #e8edf7;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  padding: 0.68rem;
  text-align: left;
  cursor: pointer;
}

.path-step span {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(158, 192, 255, 0.16);
  color: #b7ccff;
  font-weight: 800;
}

.path-step small {
  display: block;
  color: #aebbd6;
}

.path-step.active {
  border-color: rgba(94, 234, 212, 0.45);
  background: rgba(94, 234, 212, 0.1);
}

.path-step.done span {
  background: rgba(94, 234, 212, 0.18);
  color: #a7f3d0;
}

.detail-panel {
  padding: 1rem;
}

.detail-head,
.tools-panel {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  flex-wrap: wrap;
}

.focus-grid,
.study-grid {
  display: grid;
  gap: 0.8rem;
  margin-top: 1rem;
}

.focus-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.study-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.focus-grid section,
.study-grid section,
.quiz-panel {
  border: 1px solid rgba(120, 148, 214, 0.2);
  border-radius: 0.85rem;
  background: rgba(16, 23, 40, 0.58);
  padding: 0.85rem;
}

.detail-panel h3,
.tools-panel h2 {
  margin-bottom: 0.45rem;
}

.detail-panel ol,
.detail-panel ul {
  margin: 0;
  padding-left: 1.2rem;
  color: #c4d0e8;
}

.detail-panel li + li {
  margin-top: 0.35rem;
}

.quiz-panel {
  margin-top: 1rem;
}

.answer-grid {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.7rem;
}

.answer {
  border: 1px solid rgba(120, 148, 214, 0.22);
  border-radius: 0.72rem;
  padding: 0.65rem;
  text-align: left;
  color: #e8edf7;
  background: rgba(16, 23, 40, 0.76);
  cursor: pointer;
}

.answer.correct {
  border-color: rgba(52, 211, 153, 0.58);
  background: rgba(52, 211, 153, 0.14);
}

.answer.wrong {
  border-color: rgba(251, 113, 133, 0.58);
  background: rgba(251, 113, 133, 0.14);
}

.feedback {
  margin-top: 0.7rem;
  font-weight: 700;
}

.feedback.good {
  color: #a7f3d0;
}

.feedback.bad {
  color: #fecdd3;
}

.tools-panel {
  margin-top: 1rem;
  padding: 1rem;
}

.tools-panel label {
  display: grid;
  gap: 0.35rem;
  min-width: 210px;
  color: #afbdd9;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tools-panel input {
  border-radius: 0.68rem;
  border: 1px solid rgba(120, 148, 214, 0.25);
  background: rgba(16, 23, 40, 0.8);
  color: #e8edf7;
  padding: 0.62rem 0.68rem;
}

.word-result {
  flex-basis: 100%;
  color: #9ec0ff;
  font-weight: 700;
}

.source-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.source-row a {
  color: #9ec0ff;
  font-weight: 700;
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

.btn.soft {
  border-color: rgba(120, 148, 214, 0.25);
}

@media (max-width: 900px) {
  .matura-hero,
  .learning-layout,
  .focus-grid,
  .study-grid {
    grid-template-columns: 1fr;
  }
}
</style>
