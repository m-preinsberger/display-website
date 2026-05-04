<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

type TextType = {
  id: string
  title: string
  definition: string
  goal: string
  wordCount: string
  context: string
  actions: string[]
  structure: string[]
  criteria: string[]
  language: string[]
  boundary: string
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
    id: 'eroerterung',
    title: 'Erörterung',
    definition:
      'Schriftliche Auseinandersetzung mit einem strittigen Thema anhand der Textbeilage, der eigenen Position und weiterer relevanter Perspektiven.',
    goal: 'Ein Problem multiperspektivisch behandeln, Argumente abwägen und zu einer begründeten Einordnung kommen.',
    wordCount: '405-495 oder 540-660 Wörter',
    context: 'Kein von der Prüfungssituation abweichender Kontext.',
    actions: ['Argumentation', 'Deskription', 'Evaluation', 'Explikation', 'Narration', 'Rekapitulation'],
    structure: [
      'Einleitung: Problemstellung aus der Textbeilage klar benennen',
      'Hauptteil: These, Argumente, Belege, Einschränkungen und Gegenargumente verbinden',
      'Schluss: Ergebnis einordnen und eventuell einen Ausblick geben',
    ],
    criteria: [
      'Perspektiven der Beteiligten ausgewogen berücksichtigen',
      'Argumente relevant, haltbar und klar miteinander verknüpfen',
      'Gedanken aus der Textbeilage selbstständig fortführen, ergänzen oder widerlegen',
      'Gegenargumente sichtbar einbeziehen',
    ],
    language: [
      'sachlich und strukturiert argumentieren',
      'Verben der Meinungsäußerung und meinungsabtönende Partikeln gezielt einsetzen',
      'Konjunktionen und andere Verknüpfungsmittel sauber nutzen',
    ],
    boundary:
      'Die Erörterung ist eine schulische Textsorte. Verwandte Formen können argumentativ ähnlich sein, brauchen aber einen konkreteren Anlass oder ein anderes Format.',
    memory: 'ausgewogen abwägen',
    quiz: {
      question: 'Was muss eine Erörterung unbedingt leisten?',
      options: ['Mehrere Perspektiven abwägen', 'Nur die Textbeilage zusammenfassen', 'Eine Briefform verwenden'],
      answer: 'Mehrere Perspektiven abwägen',
    },
  },
  {
    id: 'kommentar',
    title: 'Kommentar',
    definition:
      'Journalistische Textsorte, die zur Meinungsbildung einer interessierten Öffentlichkeit beiträgt.',
    goal: 'Zu einem öffentlich diskutierten Thema klar Stellung nehmen, Argumente zuspitzen und Leserinnen und Leser zum Nachdenken bringen.',
    wordCount: '270-330, 405-495 oder 540-660 Wörter',
    context: 'Situativer Kontext erforderlich, zum Beispiel Zeitung, Rolle oder Veröffentlichungssituation.',
    actions: ['Argumentation', 'Deskription', 'Evaluation', 'Explikation', 'Narration', 'Rekapitulation'],
    structure: [
      'Einleitung: Problemstellung aus der Textbeilage knapp darstellen',
      'Hauptteil: eigene These mit Belegen, Beispielen und möglichen Einschränkungen entwickeln',
      'Schluss: klare Positionierung oder pointierte Schlussfolgerung',
    ],
    criteria: [
      'Sachverhalt nur so ausführlich darstellen, wie es für das Schreibziel nötig ist',
      'Eigene Position eindeutig formulieren',
      'Argumentation auf Thema und Öffentlichkeit beziehen',
      'Thesen und Argumente aus der Textbeilage eigenständig weiterführen',
    ],
    language: [
      'journalistisch, verdichtet und pointiert schreiben',
      'rhetorische Mittel wie Fragen, Ellipsen oder Kurzsätze gezielt einsetzen',
      'in der Regel unpersönlich formulieren und „ich“ sparsam verwenden',
    ],
    boundary:
      'Der Kommentar ist komplexer und pointierter als ein typischer Leserbrief und unterscheidet sich von der Erörterung durch stärkere öffentliche Positionierung und Stilverdichtung.',
    memory: 'pointiert positionieren',
    quiz: {
      question: 'Was ist für den Kommentar besonders typisch?',
      options: ['Klare Position mit Pointierung', 'Völlige Neutralität', 'Briefkopf und Schlussformel'],
      answer: 'Klare Position mit Pointierung',
    },
  },
  {
    id: 'leserbrief',
    title: 'Leserbrief',
    definition:
      'Kompakte Darstellung persönlicher Meinung in einem Medium als Reaktion auf veröffentlichte Berichte, Aussagen oder Themen.',
    goal: 'Zustimmen, widersprechen, ergänzen oder korrigieren und dabei direkt auf die Textbeilage reagieren.',
    wordCount: '270-330 Wörter',
    context: 'Situativer Kontext erforderlich; der Brief reagiert auf ein Medium oder eine konkrete Veröffentlichung.',
    actions: ['Argumentation', 'Deskription', 'Evaluation', 'Explikation', 'Narration', 'Rekapitulation'],
    structure: [
      'Eröffnungsformel und direkte Adressierung, zum Beispiel Redaktion, Verfasser/in oder Leserschaft',
      'Einleitung: Schreibanlass mit Textsorte, Titel, Autor/in, Medium und Erscheinungsdatum nennen',
      'Hauptteil: eigene Position schlüssig als Zustimmung, Ablehnung, Ergänzung oder Widerspruch ausführen',
      'Schluss: Appell, Bewertung, Fazit oder Ausblick plus Schlussformel',
    ],
    criteria: [
      'Inhaltlich explizit auf die Textbeilage reagieren',
      'Briefform und Adressierung beachten; ein Briefkopf ist bei der SRDP nicht notwendig',
      'Eigene Gedanken verdichtet und nachvollziehbar führen',
      'Keine Beschimpfungen oder Beleidigungen verwenden',
    ],
    language: [
      'kompakt und adressatenbezogen schreiben',
      'Stil kann sachlich, subjektiv kritisch, polemisch oder provozierend sein',
      'trotz persönlicher Meinung argumentativ nachvollziehbar bleiben',
    ],
    boundary:
      'Ein offener Brief richtet sich breiter an die Öffentlichkeit und muss nicht auf die Berichterstattung eines konkreten Mediums reagieren.',
    memory: 'gezielt reagieren',
    quiz: {
      question: 'Was ist im Leserbrief laut Katalog zentral?',
      options: ['Explizite Reaktion auf die Textbeilage', 'Keine eigene Meinung', 'Nur literarische Deutung'],
      answer: 'Explizite Reaktion auf die Textbeilage',
    },
  },
  {
    id: 'meinungsrede',
    title: 'Meinungsrede',
    definition:
      'Druckfassung einer Rede, die ein bestimmtes Publikum von der eigenen Position zu einem aktuellen Thema oder Problem überzeugen soll.',
    goal: 'Ein Publikum direkt ansprechen, argumentativ überzeugen und durch Rhetorik Aufmerksamkeit steuern.',
    wordCount: '405-495 oder 540-660 Wörter',
    context: 'Situativer Kontext erforderlich; Publikum, Anlass und Rolle müssen erkennbar sein.',
    actions: ['Argumentation', 'Deskription', 'Explikation', 'Narration', 'Rekapitulation'],
    structure: [
      'Einstieg: Anrede, aktueller Anlass, überraschende Mitteilung, Zitat oder eigene Betroffenheit',
      'Hauptteil: Argumente schlüssig reihen, steigern oder dialektisch entwickeln',
      'Schluss: Zusammenfassung, Ausblick oder Appell mit starker Schlusswirkung',
    ],
    criteria: [
      'Publikum direkt adressieren und überzeugen',
      'Anlassfall und Bezug zur Textbeilage darlegen',
      'Eigene Position klar formulieren',
      'Argumente durch konkrete Beispiele, überprüfbare Daten und Fakten stützen',
    ],
    language: [
      'rhetorische Mittel gezielt einsetzen',
      'einfache, gut sprechbare Sätze verwenden',
      'Redundanzen bewusst nutzen, weil die Rede mündlich wirken soll',
    ],
    boundary:
      'Die Meinungsrede informiert und erklärt nur so weit, wie es die Argumentation stützt. Ihre Besonderheit ist die Verbindung von Argumentation, Rhetorik und Publikumsbezug.',
    memory: 'Publikum überzeugen',
    quiz: {
      question: 'Was darf in einer Meinungsrede nicht fehlen?',
      options: ['Direkte Publikumsansprache', 'Nur neutrale Analyse', 'Keine Schlusswirkung'],
      answer: 'Direkte Publikumsansprache',
    },
  },
  {
    id: 'textanalyse',
    title: 'Textanalyse',
    definition:
      'Sachliche Beschreibung eines nicht-fiktionalen Textes nach Analyse sprachlicher, formaler und inhaltlicher Aspekte.',
    goal: 'Bestimmte Aspekte eines Sachtextes herausarbeiten und anhand von Textbelegen nachvollziehbar darstellen.',
    wordCount: '405-495 oder 540-660 Wörter',
    context: 'Kein von der Prüfungssituation abweichender Kontext.',
    actions: ['Deskription', 'Explikation', 'Narration', 'Rekapitulation'],
    structure: [
      'Einleitung: Basisinformationen nennen, also Textsorte, Titel, Autor/in, Medium und Erscheinungsdatum',
      'Hauptteil: formale, syntaktische, sprachliche und inhaltliche Elemente analysieren',
      'Schluss: Analyseergebnisse zusammenfassen und gegebenenfalls Textqualitäten oder Textfunktionen einschätzen',
    ],
    criteria: [
      'Nur analysieren, nicht interpretieren',
      'Genau mit Textstellen, Benennungen und Zitaten umgehen',
      'Aspekte wie Intention, sprachliche Gestaltung oder Argumentationsstruktur herausarbeiten',
      'Schlussfolgerungen auf belegte Analyseergebnisse stützen',
    ],
    language: [
      'sachlich, abstrahierend und informativ-darlegend formulieren',
      'Fachterminologie korrekt und inhaltlich passend verwenden',
      'persönliche Geschmacksurteile vermeiden',
    ],
    boundary:
      'Anders als die Textinterpretation bleibt die Textanalyse auf der Ebene des analytisch Feststellbaren.',
    memory: 'sachlich feststellen',
    quiz: {
      question: 'Welche Grenze gilt für die Textanalyse?',
      options: ['Keine Interpretation', 'Immer Briefform', 'Immer eigene Meinung'],
      answer: 'Keine Interpretation',
    },
  },
  {
    id: 'textinterpretation',
    title: 'Textinterpretation',
    definition:
      'Deutung eines literarischen Textes auf Grundlage der Untersuchung von Textmerkmalen.',
    goal: 'Bedeutungsebenen erschließen und zeigen, wie Form, Sprache, Inhalt und Wirkung zusammenhängen.',
    wordCount: '540-660 Wörter',
    context: 'Kein von der Prüfungssituation abweichender Kontext erforderlich.',
    actions: ['Argumentation', 'Deskription', 'Explikation', 'Narration', 'Rekapitulation'],
    structure: [
      'Einleitung: Textsorte, Titel, Autor/in und Erscheinungs- oder Entstehungsjahr nennen',
      'Hauptteil: Thema oder Handlung nachvollziehbar zusammenfassen',
      'Hauptteil: relevante formale, syntaktische und inhaltliche Elemente analysieren',
      'Hauptteil: Interpretationshypothese entwickeln oder überprüfen und Symbolgehalt erklären',
      'Schluss: Interpretationsergebnisse knapp zusammenfassen',
    ],
    criteria: [
      'Bedeutung oder mehrere Bedeutungsebenen erschließen',
      'Interpretation auf Analyseergebnisse stützen',
      'Historische, kulturelle, biografische oder intertextuelle Kontexte nur passend einbeziehen',
      'Analyseaspekte leserfreundlich in den Gesamttext einbinden',
    ],
    language: [
      'Fachtermini korrekt und einheitlich verwenden',
      'eigenständiges, vom Ausgangstext gelöstes Vokabular nutzen',
      'direkte und indirekte Zitate klar kennzeichnen',
    ],
    boundary:
      'Die Textinterpretation setzt dort fort, wo die Textanalyse endet: Sie nutzt Analyse, um literarische Bedeutung zu erschließen.',
    memory: 'literarisch deuten',
    quiz: {
      question: 'Worauf muss eine Interpretation aufbauen?',
      options: ['Auf Analyseergebnissen', 'Auf reiner Privatmeinung', 'Auf einer Briefform'],
      answer: 'Auf Analyseergebnissen',
    },
  },
  {
    id: 'zusammenfassung',
    title: 'Zusammenfassung',
    definition:
      'Komprimierung einer oder mehrerer Textbeilagen zur Wiedergabe relevanter Informationen und der logisch-sachlichen Struktur.',
    goal: 'Kernaussagen in eigenen Worten so wiedergeben, dass der Text auch ohne Kenntnis der Vorlage verständlich ist.',
    wordCount: '270-330 Wörter',
    context: 'Situativer Kontext erforderlich.',
    actions: ['Deskription', 'Narration', 'Rekapitulation'],
    structure: [
      'Einleitung: Textsorte, Titel, Autor/in, Quelle oder Medium, Erscheinungsort und -datum nennen',
      'Einleitung: Thema der Textbeilage darstellen',
      'Hauptteil: Kernaussagen strukturiert und logisch nachvollziehbar wiedergeben',
    ],
    criteria: [
      'Text sinngemäß und reduziert rekonstruieren',
      'Keine Interpretation und keine eigene Stellungnahme einbauen',
      'Inhaltsgetreu und eigenständig verständlich bleiben',
      'Direkte Zitate nur verwenden, wenn sie für den komprimierten Inhalt besonders wichtig sind',
    ],
    language: [
      'sachlich und eigenständig formulieren',
      'Fachsprache übernehmen, wenn sie nötig ist, sonst Distanz zum Stil der Vorlage halten',
      'Kohärenz trotz Verdichtung sichern und Mittel der Redewiedergabe variieren',
    ],
    boundary:
      'Die Zusammenfassung enthält nie Bewertung oder eigene Stellungnahme, sondern beschränkt sich auf die komprimierte Wiedergabe der Quelle.',
    memory: 'neutral komprimieren',
    quiz: {
      question: 'Was ist bei einer Zusammenfassung ausgeschlossen?',
      options: ['Eigene Stellungnahme', 'Basisinformationen', 'Kernaussagen'],
      answer: 'Eigene Stellungnahme',
    },
  },
]

const writingActions = [
  {
    title: 'Deskription',
    copy: 'neutrale Beschreibung von Zuständen, Personen, Orten, Gegenständen oder Ereignissen',
  },
  {
    title: 'Narration',
    copy: 'Darstellung von Ereignissen oder Entwicklungen in zeitlicher und teils ursächlicher Ordnung',
  },
  {
    title: 'Explikation',
    copy: 'Erklärung von Zusammenhängen, etwa Ursache-Wirkung, Zweck-Mittel oder Ganzes-Teil',
  },
  {
    title: 'Argumentation',
    copy: 'Begründung einer Position durch These, Argumente, Einwände, Belege und Schlussfolgerung',
  },
  {
    title: 'Rekapitulation',
    copy: 'knappe Wiederaufnahme relevanter Informationen aus Textbeilagen oder bisherigen Gedankengängen',
  },
  {
    title: 'Evaluation',
    copy: 'bewertende Einordnung nach nachvollziehbaren Kriterien, besonders bei argumentativen Textsorten',
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
        <p class="eyebrow">SRDP Deutsch · offizieller Textsortenkatalog</p>
        <h1>Interaktiver Lernpfad für die 7 Textsorten</h1>
        <p class="lead">
          Trainiere die offiziellen Definitionen, Schreibhandlungen, Bewertungskriterien und Wortumfänge aus dem
          Textsortenkatalog. Dein Fortschritt bleibt lokal im Browser gespeichert.
        </p>
      </div>
      <aside class="progress-panel">
        <p class="progress-number">{{ progressPercent }}%</p>
        <p>{{ completedCount }} von {{ textTypes.length }} Textsorten erledigt</p>
        <div class="progress-track" aria-hidden="true">
          <span :style="{ width: `${progressPercent}%` }"></span>
        </div>
        <button class="btn soft" type="button" @click="resetProgress">Fortschritt zurücksetzen</button>
      </aside>
    </header>

    <section class="official-note" aria-labelledby="official-title">
      <div>
        <p class="eyebrow">Stand September 2020</p>
        <h2 id="official-title">Was der Katalog wirklich prüfungsrelevant macht</h2>
      </div>
      <p>
        Textsorten sind keine starren Vorlagen, sondern wiedererkennbare Muster für konkrete Kommunikationssituationen.
        Für die SRDP werden sie über Ziel, Kontext, Schreibhandlungen, Struktur, Sprache und Umfang beschrieben.
      </p>
    </section>

    <section class="exam-rule">
      <strong>Prüfungsregel:</strong>
      Zwei Texte, insgesamt 900 Wörter +/- 10 %. Der Textsortenkatalog nennt genau diese sieben Textsorten; spezifische
      Werkkenntnis oder ein Literaturkanon wird nicht vorausgesetzt.
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

        <section class="definition-panel">
          <h3>Offizielle Definition kompakt</h3>
          <p>{{ selected.definition }}</p>
        </section>

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
            <h3>Situativer Kontext</h3>
            <p>{{ selected.context }}</p>
          </section>
        </div>

        <section class="actions-panel">
          <h3>Wichtige Schreibhandlungen</h3>
          <div class="tag-row">
            <span v-for="action in selected.actions" :key="action">{{ action }}</span>
          </div>
        </section>

        <div class="study-grid">
          <section>
            <h3>Gliederung und Struktur</h3>
            <ol>
              <li v-for="step in selected.structure" :key="step">{{ step }}</li>
            </ol>
          </section>
          <section>
            <h3>Bewertungskriterien</h3>
            <ul>
              <li v-for="criterion in selected.criteria" :key="criterion">{{ criterion }}</li>
            </ul>
          </section>
        </div>

        <div class="study-grid">
          <section>
            <h3>Sprache</h3>
            <ul>
              <li v-for="item in selected.language" :key="item">{{ item }}</li>
            </ul>
          </section>
          <section>
            <h3>Abgrenzung</h3>
            <p>{{ selected.boundary }}</p>
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
          <p v-else-if="quizState === 'wrong'" class="feedback bad">
            Noch einmal prüfen: Die richtige Antwort ist markiert.
          </p>
        </section>
      </article>
    </section>

    <section class="actions-reference" aria-labelledby="actions-title">
      <h2 id="actions-title">Schreibhandlungen als Bausteine</h2>
      <div class="action-grid">
        <article v-for="action in writingActions" :key="action.title">
          <strong>{{ action.title }}</strong>
          <p>{{ action.copy }}</p>
        </article>
      </div>
    </section>

    <section class="tools-panel">
      <div>
        <h2>Wortzahl-Planer</h2>
        <p>Nutze ihn, wenn du einen der zwei Maturatexte planst.</p>
      </div>
      <label>
        Geplante Wortzahl für Text 1
        <input v-model.number="wordTarget" type="number" min="0" max="990" step="10" />
      </label>
      <label>
        Anzahl Texte
        <input v-model.number="plannedTexts" type="number" min="1" max="2" />
      </label>
      <p v-if="plannedTexts === 2" class="word-result">
        Für Text 2 bleiben ca. {{ remainingWords.min }}-{{ remainingWords.max }} Wörter im erlaubten Gesamtbereich.
      </p>
      <p v-else class="word-result">Gesamtbereich: 810-990 Wörter.</p>
    </section>

    <footer class="source-row">
      <a
        href="https://www.bmb.gv.at/Themen/schule/schulpraxis/zentralmatura/srdp_ahs/klausurpruefungen/lf_sa_ms/dt_vgs.html"
        target="_blank"
        rel="noreferrer"
      >
        BMB/BMBWF
      </a>
      <a
        href="https://www.matura.gv.at/index.php?eID=dumpFile&f=4525&t=f&token=950c7f2b86f0ebc3459c5f0aa0e04013ab99c572"
        target="_blank"
        rel="noreferrer"
      >
        Textsortenkatalog
      </a>
      <a
        href="https://www.matura.gv.at/index.php?eID=dumpFile&f=4841&t=f&token=c757edec822756f93c143afc9f25741ddee32048"
        target="_blank"
        rel="noreferrer"
      >
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
  max-width: 22ch;
}

.progress-panel,
.official-note,
.exam-rule,
.path-panel,
.detail-panel,
.tools-panel,
.actions-reference {
  background: linear-gradient(160deg, rgba(26, 35, 59, 0.75), rgba(12, 17, 30, 0.85));
  border: 1px solid rgba(120, 148, 214, 0.2);
  border-radius: 1rem;
}

.official-note {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.1), rgba(26, 35, 59, 0.82));
}

.official-note p:last-child {
  color: #c4d0e8;
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

.definition-panel,
.actions-panel,
.focus-grid section,
.study-grid section,
.quiz-panel,
.action-grid article {
  border: 1px solid rgba(120, 148, 214, 0.2);
  border-radius: 0.85rem;
  background: rgba(16, 23, 40, 0.58);
  padding: 0.85rem;
}

.definition-panel {
  margin-top: 1rem;
}

.focus-grid,
.study-grid,
.action-grid {
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

.detail-panel h3,
.tools-panel h2,
.actions-reference h2 {
  margin-bottom: 0.45rem;
}

.detail-panel p,
.action-grid p {
  color: #c4d0e8;
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

.actions-panel {
  margin-top: 1rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.tag-row span {
  border: 1px solid rgba(94, 234, 212, 0.25);
  border-radius: 999px;
  background: rgba(94, 234, 212, 0.1);
  color: #d9fff8;
  padding: 0.32rem 0.58rem;
  font-size: 0.88rem;
  font-weight: 700;
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

.actions-reference,
.tools-panel {
  margin-top: 1rem;
  padding: 1rem;
}

.action-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.action-grid strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #a7f3d0;
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
  .official-note,
  .learning-layout,
  .focus-grid,
  .study-grid,
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
