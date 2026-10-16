<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
type Card = { id: string; term: string; definition: string; level: number; due: number }
type Deck = { id: string; title: string; year: number; cards: Card[] }
const authenticated = ref(false), loading = ref(true), busy = ref(false), password = ref(''), error = ref('')
const decks = ref<Deck[]>([]), revision = ref<string | null>(null), dirty = ref(false), saved = ref('')
const dataReady = ref(false)
const selected = ref(''), search = ref(''), year = ref(0)
const editing = ref(false), editId = ref(''), title = ref(''), editYear = ref(1), rows = ref<Card[]>([]), bulk = ref('')
const mode = ref<'cards' | 'write'>('cards'), studying = ref(false), queue = ref<Card[]>([]), index = ref(0), flipped = ref(false), answer = ref(''), checked = ref(false), correct = ref(false), score = ref(0), reverse = ref(false)
const deck = computed(() => decks.value.find(d => d.id === selected.value))
const visible = computed(() => decks.value.filter(d => (!year.value || d.year === year.value) && d.title.toLocaleLowerCase('de').includes(search.value.toLocaleLowerCase('de'))))
const allCards = computed(() => decks.value.flatMap(d => d.cards))
const due = computed(() => allCards.value.filter(c => c.due <= Date.now()).length)
const learned = computed(() => allCards.value.filter(c => c.level >= 3).length)
const current = computed(() => queue.value[index.value])
const progress = computed(() => queue.value.length ? Math.round(index.value / queue.value.length * 100) : 0)
const blank = (): Card => ({ id: crypto.randomUUID(), term: '', definition: '', level: 0, due: 0 })
async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/learning/${path}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (response.ok && !response.headers.get('content-type')?.includes('application/json')) throw new Error('Der Lernserver ist noch nicht verfügbar. Bitte versuche es später erneut.')
  const data = await response.json().catch(() => ({ error: response.status === 429 ? 'Zu viele Versuche. Bitte warte eine Minute.' : 'Der Server ist gerade nicht erreichbar.' }))
  if (!response.ok) {
    if (response.status === 401) { authenticated.value = false; studying.value = false }
    throw new Error(data.error || 'Die Anfrage ist fehlgeschlagen.')
  }
  return data
}
async function load() {
  dataReady.value = false
  const result = await api('data')
  decks.value = result.data.decks; revision.value = result.revision; dirty.value = false
  selected.value = decks.value[0]?.id || ''
  dataReady.value = true; error.value = ''
}
async function login() {
  busy.value = true; error.value = ''
  try { await api('auth', 'POST', { password: password.value }); password.value = ''; authenticated.value = true; if (!dirty.value) await load() }
  catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
async function save() {
  if (!dataReady.value) { error.value = 'Bitte lade zuerst deine Sammlung.'; return false }
  busy.value = true; error.value = ''; dirty.value = true; saved.value = ''
  try {
    const result = await api('data', 'PUT', { data: { decks: decks.value }, revision: revision.value })
    revision.value = result.revision; dirty.value = false; saved.value = 'Alles gespeichert'
    return true
  } catch (e) { error.value = (e as Error).message; return false }
  finally { busy.value = false }
}
async function logout() {
  if ((dirty.value || editing.value) && !window.confirm('Ungespeicherte Änderungen verwerfen und abmelden?')) return
  busy.value = true
  try { await api('auth', 'DELETE'); authenticated.value = false; decks.value = []; rows.value = []; queue.value = []; studying.value = false; editing.value = false; dirty.value = false; error.value = ''; saved.value = '' }
  catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
function edit(existing?: Deck) {
  editId.value = existing?.id || ''; title.value = existing?.title || ''; editYear.value = existing?.year || 1
  rows.value = existing ? structuredClone(existing.cards.map(c => ({ ...c }))) : [blank(), blank(), blank()]
  bulk.value = ''; editing.value = true; studying.value = false; error.value = ''
}
function importRows() {
  const lines = bulk.value.trim().split(/\r?\n/).filter(Boolean)
  const parsed = lines.map(line => line.split('\t'))
  if (!bulk.value.trim() || parsed.some(parts => parts.length !== 2 || parts.some(p => !p.trim() || p.trim().length > 500))) { error.value = 'Bitte pro Zeile genau einen Begriff und eine Bedeutung einfügen, getrennt durch einen Tabulator.'; return }
  if (rows.value.length + parsed.length > 1000) { error.value = 'Maximal 1.000 Karten pro Set.'; return }
  rows.value = rows.value.filter(c => c.term.trim() || c.definition.trim()).concat(parsed.map(p => ({ ...blank(), term: p[0]!.trim(), definition: p[1]!.trim() })))
  bulk.value = ''; error.value = ''
}
async function saveDeck() {
  const cards = rows.value.filter(c => c.term.trim() || c.definition.trim())
  if (!title.value.trim() || !cards.length || cards.some(c => !c.term.trim() || !c.definition.trim())) { error.value = 'Gib dem Set einen Namen und fülle beide Seiten jeder Karte aus.'; return }
  if (!editId.value && decks.value.length >= 100) { error.value = 'Maximal 100 Sets.'; return }
  const old = decks.value.find(d => d.id === editId.value)
  const next: Deck = { id: editId.value || crypto.randomUUID(), title: title.value.trim(), year: editYear.value, cards: cards.map(c => {
    const previous = old?.cards.find(p => p.id === c.id)
    const changed = previous && (previous.term !== c.term.trim() || previous.definition !== c.definition.trim())
    return { ...c, term: c.term.trim(), definition: c.definition.trim(), ...(changed ? { level: 0, due: 0 } : {}) }
  }) }
  decks.value = old ? decks.value.map(d => d.id === next.id ? next : d) : [...decks.value, next]
  selected.value = next.id; editing.value = false; await save()
}
async function deleteDeck() {
  if (!deck.value || !window.confirm(`„${deck.value.title}“ mit allen Karten und Fortschritten löschen?`)) return
  decks.value = decks.value.filter(d => d.id !== selected.value); selected.value = decks.value[0]?.id || ''; await save()
}
function start(onlyDue = false) {
  if (!deck.value) return
  queue.value = deck.value.cards.filter(c => !onlyDue || c.due <= Date.now()).map(c => ({ ...c }))
  for (let i = queue.value.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue.value[i], queue.value[j]] = [queue.value[j]!, queue.value[i]!] }
  index.value = 0; score.value = 0; flipped.value = false; checked.value = false; answer.value = ''; studying.value = true
}
const normalize = (s: string) => s.trim().toLocaleLowerCase('de').normalize('NFC').replace(/\s+/g, ' ')
function check() { if (!current.value) return; correct.value = (reverse.value ? current.value.term : current.value.definition).split('|').some(s => normalize(s) === normalize(answer.value)); checked.value = true }
async function rate(known: boolean) {
  if (!current.value || busy.value) return
  const card = deck.value?.cards.find(c => c.id === current.value!.id)
  if (!card) return
  card.level = known ? Math.min(6, card.level + 1) : 0
  card.due = Date.now() + (known ? [0, 1, 3, 7, 14, 30, 60][card.level]! * 86400000 : 600000)
  if (known) score.value++
  index.value++; flipped.value = false; checked.value = false; answer.value = ''
  await save()
}
function backup() {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, decks: decks.value }, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = `grace-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url)
}
async function restore(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; if (!file) return
  try {
    if (file.size > 2000000) throw new Error('Backup ist zu groß.')
    const data = JSON.parse(await file.text())
    if (data.version !== 1 || !Array.isArray(data.decks) || data.decks.length > 100) throw new Error('Ungültiges Backup.')
    const ids = new Set<string>()
    for (const d of data.decks) {
      if (!d || typeof d.id !== 'string' || d.id.length > 80 || ids.has(d.id) || typeof d.title !== 'string' || !d.title.trim() || d.title.length > 100 || ![1,2,3].includes(d.year) || !Array.isArray(d.cards) || d.cards.length > 1000) throw new Error('Ungültiges Set im Backup.')
      ids.add(d.id); const cardIds = new Set<string>()
      for (const c of d.cards) { if (!c || typeof c.id !== 'string' || c.id.length > 80 || cardIds.has(c.id) || !['term','definition'].every(k => typeof c[k] === 'string' && c[k].trim() && c[k].length <= 500) || !Number.isInteger(c.level) || c.level < 0 || c.level > 6 || !Number.isFinite(c.due) || c.due < 0) throw new Error('Ungültige Karte im Backup.'); cardIds.add(c.id) }
    }
    if (!window.confirm('Alle aktuellen Sets und Fortschritte durch dieses Backup ersetzen?')) return
    decks.value = data.decks; selected.value = decks.value[0]?.id || ''; await save()
  } catch (e) { error.value = (e as Error).message }
  finally { input.value = '' }
}
function beforeUnload(e: BeforeUnloadEvent) { if (dirty.value || editing.value) { e.preventDefault(); e.returnValue = '' } }
const oldTitle = document.title
onMounted(async () => {
  document.title = 'Crazy Learning Zone · Für Grace'; window.addEventListener('beforeunload', beforeUnload)
  try { authenticated.value = (await api('auth')).authenticated; if (authenticated.value) await load() }
  catch (e) { error.value = (e as Error).message }
  finally { loading.value = false }
})
onUnmounted(() => { document.title = oldTitle; window.removeEventListener('beforeunload', beforeUnload) })
</script>

<template>
  <div class="zone" lang="de">
    <header class="zone-header"><a class="zone-brand" href="/crazy-learning-zone"><span class="brand-mark">g<span>✳</span></span><span>crazy learning zone<small>DEIN KOPF. DEIN TEMPO. DEIN ORT.</small></span></a><span class="private-label">◈ Nur für dich</span><button v-if="authenticated" class="quiet" :disabled="busy" @click="logout">Abmelden ↗</button></header>
    <main v-if="loading" class="login-shell"><p role="status">Dein Lernplatz wird vorbereitet …</p></main>
    <main v-else-if="!authenticated" class="login-shell">
      <div class="login-story"><span class="eyebrow">FÜR GRACE, MIT LIEBE</span><h1>Große Ziele.<br>Kleine Schritte.<br><em>Dein Lernplatz.</em></h1><p>Zwischen OP-Alltag und ganz viel neuem Wissen: ein bisschen Ruhe, ein klarer Kopf und ein Ort nur für dich.</p><div class="note">Du musst nicht alles heute können. ♡</div></div>
      <form class="login-card" @submit.prevent="login"><span class="eyebrow">DEINE PRIVATE LERNZONE</span><h2>Schön, dass du da bist.</h2><p>Mach es dir bequem. Der nächste kleine Schritt wartet schon.</p><label for="password">Dein Passwort</label><input id="password" v-model="password" type="password" autocomplete="current-password" required maxlength="256" placeholder="Nur du kennst es"/><p v-if="error" class="error" role="alert">{{ error }}</p><button class="primary" :disabled="busy">{{ busy ? 'Einen Moment …' : 'Rein in die Lernzone →' }}</button><small>Privater Zugang · Keine öffentliche Registrierung</small></form>
    </main>
    <main v-else class="workspace">
      <aside class="sidebar"><span class="eyebrow">DEIN LERNRAUM</span><button class="nav-active" @click="studying = false">▦ &nbsp; Vokabelstudio</button><div class="journey"><span class="eyebrow">DEIN WEG ZUR OTA</span><p>Drei Jahre.<br>So viele Möglichkeiten.</p><div v-for="n in 3" :key="n" class="year-line"><span>{{ n }}</span> Ausbildungsjahr {{ n }}</div></div><div class="sidebar-note">Ein Wort nach dem anderen.<br>Du schaffst das, Grace. ♡</div><button class="quiet" @click="backup">↓ Backup herunterladen</button><label class="restore">↑ Backup wiederherstellen<input type="file" accept="application/json,.json" :disabled="busy || dirty || studying || editing" @change="restore"/></label></aside>
      <section class="content">
        <div class="topline"><span class="eyebrow">DEIN VOKABELSTUDIO</span><span class="save-state" role="status">{{ busy ? 'Wird gespeichert …' : dirty ? 'Ungespeicherte Änderungen' : saved || 'Privat & synchronisiert' }}</span></div>
        <div v-if="error" class="error" role="alert">{{ error }} <button v-if="dirty" :disabled="busy" @click="save">Speichern erneut versuchen</button><button v-else :disabled="busy" @click="load().catch(e => error = e.message)">Erneut laden</button></div>
        <div v-if="!dataReady" class="panel"><h2>Deine Sammlung wird geladen.</h2><p>Falls das Laden fehlschlägt, versuche es über die Meldung oben erneut.</p></div>
        <template v-else-if="editing">
          <div class="section-heading"><div><h1>{{ editId ? 'Dein Set, dein Wissen.' : 'Platz für neues Wissen.' }}</h1><p>Aus deinen Unterlagen direkt in deine Lernroutine.</p></div></div>
          <form class="editor panel" @submit.prevent="saveDeck"><div class="editor-meta"><label>Name des Sets<input v-model="title" maxlength="100" required placeholder="z. B. Anatomie · Richtungsbezeichnungen"/></label><label>Ausbildungsjahr<select v-model="editYear"><option v-for="n in 3" :key="n" :value="n">{{ n }}. Jahr</option></select></label></div><p class="hint">Begriff links, Bedeutung rechts. Alternative Antworten mit | trennen. Geänderte Karten starten wieder bei null.</p><div v-for="(row, i) in rows" :key="row.id" class="edit-row"><span>{{ i + 1 }}</span><input v-model="row.term" :aria-label="`Begriff ${i + 1}`" maxlength="500" placeholder="Latein / Fachbegriff"/><input v-model="row.definition" :aria-label="`Bedeutung ${i + 1}`" maxlength="500" placeholder="Deutsch / Erklärung"/><button type="button" class="quiet" :aria-label="`Karte ${i + 1} entfernen`" @click="rows.splice(i, 1)">×</button></div><button type="button" class="secondary" :disabled="rows.length >= 1000" @click="rows.push(blank())">+ Karte hinzufügen</button><details><summary>Mehrere Karten aus einer Tabelle importieren</summary><p>Zwei Spalten aus Excel oder einem tabulatorgetrennten Export kopieren. Jede Zeile wird eine Karte.</p><textarea v-model="bulk" aria-label="Karten zum Importieren" rows="5" placeholder="Begriff [Tabulator] Bedeutung"/><button type="button" class="secondary" @click="importRows">Karten übernehmen</button></details><div class="actions"><button class="primary" :disabled="busy">Set speichern</button><button type="button" class="quiet" @click="editing = false; error = ''">Abbrechen</button></div></form>
        </template>
        <template v-else-if="studying">
          <button class="quiet" @click="studying = false">← Zurück zu deinen Sets</button><h1>{{ deck?.title }}</h1><div class="study-meta"><span>{{ mode === 'cards' ? 'Karteikarten' : 'Schreibtraining' }} · {{ reverse ? 'Deutsch → Begriff' : 'Begriff → Deutsch' }}</span><span>{{ Math.min(index + 1, queue.length) }} / {{ queue.length }}</span></div><div class="progress"><span :style="{ width: `${progress}%` }"></span></div>
          <template v-if="current"><div class="flashcard"><span class="eyebrow">{{ flipped || checked ? 'DIE BEDEUTUNG' : 'WEISST DU ES NOCH?' }}</span><h2>{{ flipped ? (reverse ? current.term : current.definition) : (reverse ? current.definition : current.term) }}</h2><button v-if="mode === 'cards'" class="quiet" @click="flipped = !flipped">{{ flipped ? '↶ Begriff anzeigen' : '↻ Karte umdrehen' }}</button><form v-else @submit.prevent="check"><label for="answer">Deine Antwort</label><input id="answer" v-model="answer" autocomplete="off" :disabled="checked" autofocus/><button v-if="!checked" class="primary" :disabled="!answer.trim()">Antwort prüfen</button><div v-else class="feedback" role="status"><strong>{{ correct ? 'Genau richtig!' : 'Fast — schau noch einmal hin.' }}</strong><p>{{ reverse ? current.term : current.definition }}</p></div></form></div><div v-if="flipped || checked" class="rating"><template v-if="mode === 'cards'"><button class="secondary" :disabled="busy || dirty" @click="rate(false)">Noch üben ↺</button><button class="primary" :disabled="busy || dirty" @click="rate(true)">Gewusst ✓</button></template><template v-else><button class="primary" :disabled="busy || dirty" @click="rate(correct)">Weiter →</button><button v-if="!correct" class="quiet" :disabled="busy || dirty" @click="rate(true)">Meine Antwort war auch richtig</button></template></div><p class="study-note">Gewusste Karten kommen nach 1, 3, 7, 14, 30 und 60 Tagen wieder. Schwierige nach 10 Minuten.</p></template>
          <div v-else class="finish panel"><span class="finish-icon">✳</span><h2>{{ queue.length ? 'Ein Stück weiter. Gut gemacht.' : 'Alles wiederholt. Durchatmen.' }}</h2><p v-if="queue.length">{{ score }} von {{ queue.length }} Karten gewusst. Jeder Versuch zählt.</p><p v-else>In diesem Set sind gerade keine Karten fällig.</p><button class="primary" @click="studying = false">Zurück zur Übersicht</button></div>
        </template>
        <template v-else>
          <div class="section-heading"><div><h1>Hey Grace.<br><em>Was lernen wir heute?</em></h1><p>Ein kleiner Anfang ist auch ein Anfang.</p></div><button class="primary" :disabled="busy || dirty" @click="edit()">+ Neues Lernset</button></div>
          <div class="stats"><div><span class="stat-icon">↺</span><strong>{{ due }}</strong><span>bereit zum Wiederholen</span></div><div><span class="stat-icon">✳</span><strong>{{ learned }}</strong><span>mindestens 3× gewusst</span></div><div><span class="stat-icon">▤</span><strong>{{ decks.length }}</strong><span>Sets voller Wissen</span></div></div>
          <div class="library-heading"><h2>Deine Lernsets <span>{{ decks.length }}</span></h2><div class="filters"><input v-model="search" aria-label="Lernsets suchen" placeholder="Lernset suchen …"/><select v-model="year" aria-label="Ausbildungsjahr filtern"><option :value="0">Alle Jahre</option><option v-for="n in 3" :key="n" :value="n">{{ n }}. Jahr</option></select></div></div>
          <div v-if="!decks.length" class="empty panel"><div class="empty-art">a <span>↔</span> α</div><h2>Dein erstes Set ist der Anfang.</h2><p>Latein, Anatomie oder Fachbegriffe: bring deine eigenen Schulunterlagen mit. Erstelle Karten einzeln oder importiere eine ganze Liste.</p><button class="primary" :disabled="busy || dirty" @click="edit()">Mein erstes Lernset erstellen →</button></div>
          <p v-else-if="!visible.length" class="panel">Keine Sets gefunden. Probiere einen anderen Suchbegriff oder ein anderes Jahr.</p>
          <div v-else class="deck-grid"><button v-for="item in visible" :key="item.id" class="deck-card" :class="{ selected: selected === item.id }" :aria-pressed="selected === item.id" @click="selected = item.id"><div class="deck-top"><span class="deck-symbol">Aa</span><span>{{ item.year }}. JAHR</span></div><h3>{{ item.title }}</h3><p>{{ item.cards.length }} Karten <span>· {{ item.cards.filter(c => c.due <= Date.now()).length }} fällig</span></p><div class="progress"><span :style="{ width: `${item.cards.length ? item.cards.filter(c => c.level >= 3).length / item.cards.length * 100 : 0}%` }"></span></div><small>{{ item.cards.filter(c => c.level >= 3).length }} sicherer geworden <span>Auswählen ↗</span></small></button></div>
          <div v-if="deck" class="study-launch panel"><div><span class="eyebrow">DEIN NÄCHSTER KLEINER SCHRITT</span><h2>{{ deck.title }}</h2><div class="study-options"><label>Lernmodus<select v-model="mode"><option value="cards">Karteikarten</option><option value="write">Schreibtraining</option></select></label><label>Richtung<select v-model="reverse"><option :value="false">Begriff → Deutsch</option><option :value="true">Deutsch → Begriff</option></select></label></div></div><div class="launch-actions"><button class="primary" :disabled="busy || dirty || !deck.cards.length" @click="start(true)">Fällige Karten lernen →</button><button class="secondary" :disabled="busy || dirty || !deck.cards.length" @click="start()">Alle Karten üben</button><div><button class="quiet" :disabled="busy || dirty" @click="edit(deck)">Bearbeiten</button><button class="quiet danger" :disabled="busy || dirty" @click="deleteDeck">Löschen</button></div></div></div>
          <div class="bottom-note"><span>♡</span><p>Dieser Ort wächst mit dir.<br><small>Heute Vokabeln. Morgen all das, was du noch lernen möchtest.</small></p></div>
        </template>
      </section>
    </main>
    <div v-if="authenticated && dataReady" class="mobile-backup"><button class="quiet" @click="backup">↓ Backup herunterladen</button><label class="restore">↑ Backup wiederherstellen<input type="file" accept="application/json,.json" :disabled="busy || dirty || studying || editing" @change="restore"/></label></div>
    <footer>MIT LIEBE GEMACHT. FÜR DEINEN WEG. <span>crazy learning zone ✳</span></footer>
  </div>
</template>

<style scoped>
.mobile-backup{display:none}@media(max-width:700px){.mobile-backup{display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:20px}}
.zone{--ink:#293e38;--green:#355d4d;--muted:#738078;--line:#dfe5db;background:#f7f8f2;color:var(--ink);min-height:100vh;font-family:'Segoe UI',sans-serif;color-scheme:light}.zone *{box-sizing:border-box}.zone h1,.zone h2,.zone h3,.zone p{color:inherit}.zone button,.zone input,.zone select,.zone textarea{font:inherit}.zone button,.restore{cursor:pointer}.zone button{transition:background .15s,transform .15s}.zone button:disabled{opacity:.5;cursor:not-allowed}.zone button:focus-visible,.zone a:focus-visible,.zone input:focus-visible,.zone select:focus-visible,.zone textarea:focus-visible{outline:3px solid #b08a48;outline-offset:4px}.zone input,.zone select,.zone textarea{border:1px solid #cbd5c8;border-radius:9px;background:#fff;color:var(--ink);padding:12px;width:100%;min-width:0}.zone label{display:block;font-size:13px;font-weight:600}.zone label input,.zone label select{margin-top:7px}.zone-header{height:106px;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 5%;gap:26px}.zone-brand{color:var(--ink);text-decoration:none;display:flex;align-items:center;gap:15px;font-weight:650;font-size:19px;letter-spacing:-.5px}.zone-brand small{display:block;font-size:8px;letter-spacing:2px;margin-top:6px;font-weight:600}.brand-mark{font:italic 40px Georgia;position:relative;background:#e8eddf;border-radius:15px;width:53px;height:53px;text-align:center}.brand-mark span{position:absolute;font:20px Georgia;right:2px;top:0;color:#a48955}.private-label{margin-left:auto;font-size:12px;color:var(--muted)}.eyebrow{font-size:10px;letter-spacing:2px;font-weight:700;color:var(--muted)}.zone h1{font:46px/1.15 Georgia,serif;letter-spacing:-1.5px;margin:22px 0 15px}.zone h1 em{font-weight:400;color:#6f8264}.zone h2{font:25px/1.25 Georgia,serif;margin:12px 0}.zone h3{font:23px/1.25 Georgia,serif;margin:22px 0 10px}.zone p{line-height:1.7}.primary,.secondary,.quiet{border:0;border-radius:9px;padding:12px 18px;font-size:13px!important;font-weight:600!important}.primary{background:var(--green);color:white}.primary:hover{background:#244434}.secondary{background:#e9eee3;color:var(--ink);border:1px solid #d5dece}.quiet{background:transparent;color:var(--ink)}.quiet:hover{background:#e9eee3}.login-shell{max-width:1120px;min-height:calc(100vh - 183px);margin:auto;display:grid;grid-template-columns:1.2fr 1fr;align-items:center;gap:100px;padding:65px 30px}.login-story h1{font-size:62px}.login-story p{max-width:400px;color:var(--muted);font-size:15px}.note{margin-top:35px;font:italic 20px Georgia;color:#738568}.login-card{padding:38px;background:#fff;border:1px solid var(--line);border-radius:20px;box-shadow:0 15px 60px #283f3510}.login-card p{font-size:14px;color:var(--muted);margin-bottom:26px}.login-card button{width:100%;margin-top:20px}.login-card small{display:block;text-align:center;margin-top:23px;color:var(--muted);font-size:11px}.workspace{display:grid;grid-template-columns:220px minmax(0,1fr);max-width:1480px;margin:auto;min-height:calc(100vh - 183px)}.sidebar{padding:38px 22px;border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:stretch;gap:20px}.nav-active{padding:14px;border:0;border-radius:8px;background:#e6ecdf;color:var(--green);font-weight:600;text-align:left}.journey{margin-top:30px;border-top:1px solid var(--line);padding-top:30px}.journey p{font:20px/1.4 Georgia}.year-line{display:flex;align-items:center;gap:12px;font-size:11px;margin:18px 0;color:var(--muted)}.year-line span{border:1px solid #cbd4c3;border-radius:50%;width:27px;height:27px;display:grid;place-items:center}.sidebar-note{font:italic 16px/1.6 Georgia;color:#7c896f;margin-top:auto;padding-top:45px}.sidebar>.quiet{font-size:11px!important;padding:0;text-align:left}.restore{font-size:11px;color:var(--muted)}.restore input{font-size:10px;margin-top:7px;padding:5px}.content{padding:38px 5%;min-width:0}.topline{display:flex;justify-content:space-between;gap:12px}.save-state{font-size:11px;color:var(--muted)}.section-heading{display:flex;justify-content:space-between;align-items:center;gap:22px;margin-bottom:28px}.section-heading p{color:var(--muted);font-size:14px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:20px 0 40px}.stats>div{background:#eef1e8;border:1px solid #e1e7da;border-radius:12px;padding:20px;display:grid;grid-template-columns:1fr auto;gap:6px}.stats strong{font:34px Georgia;grid-column:1;grid-row:1}.stats div>span:last-child{grid-column:1/3;font-size:11px;color:var(--muted)}.stat-icon{grid-column:2;color:#8d9c77;font-size:24px}.library-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.library-heading h2{font-size:23px;white-space:nowrap}.library-heading h2 span{font:12px 'Segoe UI';background:#e7ecdf;padding:3px 8px;border-radius:20px;margin-left:6px}.filters{display:flex;gap:8px;max-width:360px}.filters input,.filters select{font-size:12px;padding:9px}.filters select{width:125px}.panel{background:white;border:1px solid var(--line);border-radius:15px;padding:28px}.empty{text-align:center;padding:45px 30px;background:linear-gradient(120deg,#f0f2e7,#fff)}.empty p{max-width:480px;margin:16px auto 25px;color:var(--muted);font-size:14px}.empty-art{font:46px Georgia;color:#6a7e5c}.empty-art span{font:24px Georgia;color:#b6a17b;margin:0 18px}.deck-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.deck-card{border:1px solid var(--line);border-radius:13px;background:#fff;text-align:left;padding:23px;color:var(--ink)}.deck-card.selected{border-color:#6b8662;box-shadow:0 0 0 1px #6b8662}.deck-top{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:9px;letter-spacing:1.5px}.deck-symbol{background:#edf0e4;color:#708255;border-radius:9px;padding:10px;font:21px Georgia}.deck-card p{font-size:12px}.deck-card p span{color:#84916e}.progress{height:5px;background:#e7ecdf;border-radius:20px;overflow:hidden}.progress span{height:100%;display:block;background:#8fa47a;transition:width .2s}.deck-card small{display:flex;justify-content:space-between;margin-top:12px;font-size:10px;color:var(--muted)}.study-launch{margin-top:24px;display:flex;justify-content:space-between;gap:30px;background:#f0f3eb}.study-options{display:flex;gap:12px;margin-top:20px}.study-options label{font-size:10px}.study-options select{font-size:12px}.launch-actions{display:flex;flex-direction:column;justify-content:center;gap:10px}.bottom-note{display:flex;justify-content:center;align-items:center;gap:14px;color:#7f896f;margin:35px 0 0}.bottom-note>span{font:32px Georgia}.bottom-note p{font:italic 17px Georgia}.bottom-note small{font:11px 'Segoe UI';display:inline-block;margin-top:7px}.editor-meta{display:grid;grid-template-columns:3fr 1fr;gap:15px}.hint,.editor details p{font-size:12px;color:var(--muted)}.edit-row{display:grid;grid-template-columns:20px 1fr 1fr 35px;gap:10px;align-items:center;margin:12px 0}.edit-row>span{font-size:11px;color:var(--muted)}.edit-row .quiet{padding:5px}.editor details{margin:25px 0;border-top:1px solid var(--line);padding-top:20px}.editor summary{cursor:pointer;font-size:13px}.editor textarea{margin:10px 0}.actions{display:flex;gap:12px;margin-top:25px}.error{background:#fff1e9;border:1px solid #d8b5a2;color:#823c26!important;padding:14px;border-radius:9px;margin:20px 0;font-size:13px}.error button{margin-left:8px}.danger{color:#995943}.study-meta{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin:20px 0 12px}.flashcard{min-height:330px;background:#fff;border:1px solid var(--line);border-radius:20px;margin:25px 0;padding:40px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 12px 35px #344c3510}.flashcard h2{font-size:40px;overflow-wrap:anywhere}.flashcard form{width:min(100%,450px)}.flashcard form button{margin-top:15px}.flashcard form label{margin:15px 0}.rating{display:flex;justify-content:center;gap:15px}.study-note{font-size:12px;text-align:center;color:var(--muted)!important}.feedback{margin-top:20px;color:var(--green)}.finish{text-align:center;margin:30px 0;padding:55px 25px}.finish-icon{font-size:60px;color:#8a9d72}.zone footer{border-top:1px solid var(--line);display:flex;justify-content:space-between;padding:26px 5%;font-size:9px;letter-spacing:1.5px;color:var(--muted)}
@media(min-width:1450px){.deck-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:1000px){.workspace{grid-template-columns:175px minmax(0,1fr)}.sidebar{padding:30px 15px}.zone h1{font-size:38px}.login-shell{gap:40px}.login-story h1{font-size:50px}.study-launch{flex-direction:column}.launch-actions{align-items:flex-start}.library-heading{align-items:flex-start;flex-direction:column}.filters{max-width:100%;width:100%}.stats>div{padding:15px}.section-heading{align-items:flex-start}.section-heading>.primary{margin-top:22px}}@media(max-width:700px){.zone-header{height:85px;padding:0 20px;gap:10px}.zone-brand{font-size:15px;gap:9px}.zone-brand small{font-size:6px;letter-spacing:1px}.brand-mark{width:42px;height:43px;font-size:33px}.private-label{display:none}.zone-header>.quiet{margin-left:auto;padding:8px;font-size:11px!important}.workspace{display:block}.sidebar{display:none}.content{padding:26px 20px}.zone h1{font-size:37px}.section-heading{display:block}.section-heading>.primary{margin-top:5px}.stats{gap:8px;margin-bottom:25px}.stats>div{padding:12px}.stats strong{font-size:28px}.stat-icon{font-size:19px}.stats div>span:last-child{font-size:10px}.deck-grid{grid-template-columns:1fr}.login-shell{display:block;padding:45px 22px}.login-story h1{font-size:46px}.login-story p{font-size:14px}.note{margin:20px 0 35px}.login-card{padding:25px}.zone footer{font-size:7px;gap:15px}.editor{padding:18px}.editor-meta{grid-template-columns:1fr}.edit-row{grid-template-columns:16px 1fr 28px;gap:6px;padding-bottom:15px;border-bottom:1px solid var(--line)}.edit-row input:nth-of-type(2){grid-column:2;grid-row:2}.edit-row button{grid-column:3;grid-row:1/3}.study-options{flex-wrap:wrap}.flashcard{padding:25px 18px;min-height:300px}.flashcard h2{font-size:31px}.bottom-note small{line-height:1.7}.save-state{font-size:10px}.topline .eyebrow{font-size:8px}.rating{flex-wrap:wrap}.sidebar-note{padding:0}}
</style>
