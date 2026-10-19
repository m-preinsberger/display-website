<script setup lang="ts">
import { onMounted, ref } from 'vue'
type Account = { id: string; username: string; name: string; disabled: boolean }
const props = defineProps<{ api: (path: string, method?: string, body?: unknown) => Promise<any> }>()
const users = ref<Account[]>([]), busy = ref(false), error = ref(''), notice = ref(''), ready = ref(false)
const fresh = () => ({ id: '', username: '', name: '', password: '', disabled: false })
const form = ref(fresh())
async function load() {
  busy.value = true; error.value = ''
  try { users.value = (await props.api('users')).users; ready.value = true }
  catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
function edit(account?: Account) { form.value = account ? { ...account, password: '' } : fresh(); notice.value = ''; error.value = '' }
async function save() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await props.api('users', form.value.id ? 'PUT' : 'POST', form.value)
    form.value = fresh(); notice.value = 'Konto gespeichert. Zugangsdaten kannst du jetzt persönlich weitergeben.'
    await load()
  } catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
onMounted(load)
</script>
<template>
  <main class="admin-shell">
    <span class="eyebrow">VERWALTUNG</span><h1>Ein Lernplatz für alle.</h1>
    <p>Konten anlegen, Namen ändern und Zugänge verwalten. Jede Person hat ihre eigenen Lernsets und Fortschritte.</p>
    <p v-if="error" class="error" role="alert">{{ error }} <button type="button" class="quiet" :disabled="busy" @click="load">Erneut laden</button></p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <div class="admin-grid">
      <section class="panel"><h2>Lernkonten</h2><p v-if="busy" role="status">Wird geladen …</p><p v-else-if="ready && !users.length">Noch keine Konten vorhanden.</p>
        <ul><li v-for="account in users" :key="account.id"><div><strong>{{ account.name }}</strong><small>{{ account.username }} · {{ account.disabled ? 'Gesperrt' : 'Aktiv' }}</small></div><button class="secondary" :disabled="busy" :aria-label="`${account.name} bearbeiten`" @click="edit(account)">Bearbeiten</button></li></ul>
      </section>
      <form class="panel" @submit.prevent="save"><h2>{{ form.id ? 'Konto bearbeiten' : 'Neues Lernkonto' }}</h2>
        <label>Anzeigename<input v-model="form.name" required maxlength="80" autocomplete="off"/></label>
        <label>Benutzername<input v-model="form.username" required minlength="3" maxlength="40" autocomplete="off" autocapitalize="none" :spellcheck="false"/></label>
        <p class="hint">3–40 Zeichen: Buchstaben ohne Umlaute, Zahlen, Punkt, Bindestrich oder Unterstrich. „admin“ ist reserviert.</p>
        <label>{{ form.id ? 'Neues Passwort (optional)' : 'Passwort' }}<input v-model="form.password" type="password" :required="!form.id" minlength="14" maxlength="256" autocomplete="new-password"/></label>
        <p class="hint">Mindestens 14 Zeichen. {{ form.id ? 'Leer lassen, um das bisherige Passwort zu behalten.' : 'Die Zugangsdaten persönlich weitergeben.' }} Gespeicherte Passwörter werden nicht angezeigt.</p>
        <label class="access"><input v-model="form.disabled" type="checkbox"/> Zugang sperren</label>
        <p v-if="form.id" class="hint">Änderungen melden dieses Konto auf allen Geräten ab. Lernsets und Fortschritte bleiben erhalten.</p>
        <div class="actions"><button class="primary" :disabled="busy || !ready">{{ busy ? 'Einen Moment …' : 'Konto speichern' }}</button><button type="button" class="quiet" :disabled="busy" @click="edit()">{{ form.id ? 'Abbrechen' : 'Leeren' }}</button></div>
      </form>
    </div>
  </main>
</template>
<style scoped>
.admin-shell{color:var(--ink);--heading:var(--ink);--text:var(--ink);color-scheme:light}.admin-shell h1,.admin-shell h2,.admin-shell h3{color:var(--ink)}.admin-shell .eyebrow,.admin-shell small{color:#52634f}h1{font:42px/1.15 Georgia,serif;overflow-wrap:anywhere}h2{font:25px Georgia,serif}p{line-height:1.7}.panel{background:white;border:1px solid #dfe5db;border-radius:15px;padding:28px}button,input{font:inherit}button{min-height:48px;cursor:pointer;border:0;border-radius:9px;padding:12px 18px}button:disabled{opacity:.5;cursor:not-allowed}button:focus-visible,input:focus-visible{outline:3px solid #b08a48;outline-offset:3px}label{display:block;font-size:14px;font-weight:600}input{display:block;margin-top:7px;width:100%;min-width:0;min-height:48px;border:1px solid #cbd5c8;border-radius:9px;padding:12px;background:white;color:var(--ink);font-size:16px}.primary{background:#355d4d;color:white}.secondary{background:#e9eee3;color:var(--ink)}.quiet{background:transparent;color:var(--ink)}.hint{font-size:13px;color:#647169}.eyebrow{font-size:11px;letter-spacing:2px}.error{background:#fff1e9;padding:14px;border-radius:9px;color:#823c26}.actions{display:flex;gap:12px;margin-top:24px}.access input{min-height:20px}

.admin-shell{max-width:1100px;margin:auto;padding:40px 24px}.admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:30px}.admin-shell ul{list-style:none;padding:0}.admin-shell li{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid #dfe5db}.admin-shell li div{min-width:0;overflow-wrap:anywhere}.admin-shell small{display:block;margin-top:6px}.admin-shell form label{margin-top:20px}.access{display:flex!important;align-items:center;gap:10px}.access input{width:20px!important;margin:0!important}.actions{flex-wrap:wrap}@media(max-width:700px){.admin-shell{padding:24px 16px}.admin-grid{grid-template-columns:1fr}.admin-shell .panel{padding:20px}}
</style>
