<template>
  <main class="portfolio">
    <header class="hero section">
      <div class="hero-layout">
        <div>
          <p class="eyebrow">{{ copy.eyebrow }}</p>
          <h1>{{ copy.heroTitle }}</h1>
          <p class="lead">{{ copy.heroLead }}</p>
          <div class="cta-group">
            <a class="btn primary" href="#experience">{{ copy.viewExperience }}</a>
            <a class="btn ghost" href="#contact">{{ copy.getInTouch }}</a>
          </div>
        </div>
        <figure class="profile-photo">
          <img src="/BildLebenslauf.jpeg" :alt="copy.profileAlt" />
        </figure>
      </div>
      <div class="metrics">
        <article v-for="metric in copy.metrics" :key="metric.value">
          <p class="metric-value">{{ metric.value }}</p>
          <p class="metric-label">{{ metric.label }}</p>
        </article>
      </div>
    </header>

    <section class="section" id="about">
      <h2>{{ copy.aboutTitle }}</h2>
      <p>{{ copy.aboutBody }}</p>
    </section>

    <section class="section" id="skills">
      <h2>{{ copy.skillsTitle }}</h2>
      <div class="grid skill-grid">
        <article v-for="skill in copy.skills" :key="skill.title" class="card">
          <h3>{{ skill.title }}</h3>
          <ul>
            <li v-for="item in skill.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="section" id="experience">
      <h2>{{ copy.experienceTitle }}</h2>
      <div class="grid project-grid">
        <article v-for="job in copy.experience" :key="`${job.company}-${job.title}-${job.detail}`" class="card project-card">
          <a class="project-company" :href="job.href" target="_blank" rel="noreferrer">
            <img class="company-logo" :src="job.logo" :alt="job.logoAlt" />
            <span class="project-tag">{{ job.company }}</span>
          </a>
          <h3>{{ job.title }}</h3>
          <p>{{ job.detail }}</p>
          <p class="project-outcome">{{ job.outcome }}</p>
        </article>
      </div>
    </section>

    <section class="section" id="contests">
      <h2>{{ copy.contestsTitle }}</h2>
      <div class="grid contest-grid">
        <article v-for="contest in copy.contests" :key="contest.title" class="card project-card contest-card">
          <a class="project-company" :href="contest.href" target="_blank" rel="noreferrer">
            <img class="company-logo" :src="contest.logo" :alt="contest.logoAlt" />
            <span class="project-tag">{{ contest.company }}</span>
          </a>
          <p class="contest-date">{{ contest.date }}</p>
          <h3>{{ contest.title }}</h3>
          <p v-if="contest.outcome" class="project-outcome">{{ contest.outcome }}</p>
          <p class="contest-location">{{ contest.location }}</p>
        </article>
      </div>
    </section>

    <section class="section" id="education">
      <h2>{{ copy.educationTitle }}</h2>
      <div class="timeline">
        <article v-for="school in copy.education" :key="school.name">
          <span>{{ school.number }}</span>
          <a class="school-link" :href="school.href" target="_blank" rel="noreferrer">
            <img class="school-logo" :src="school.logo" :alt="school.logoAlt" />
            <h3>{{ school.name }}</h3>
          </a>
          <p>{{ school.detail }}</p>
        </article>
      </div>
    </section>

    <section class="section contact" id="contact">
      <h2>{{ copy.contactTitle }}</h2>
      <p>{{ copy.contactBody }}</p>
      <div class="contact-links">
        <a class="contact-link" href="mailto:preinsbergermartin@gmail.com">
          <span class="contact-emoji" aria-hidden="true">@</span>
          <span>preinsbergermartin@gmail.com</span>
        </a>
        <a
          class="contact-link"
          href="https://www.linkedin.com/in/martin-preinsberger-a3943534b/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            class="contact-icon"
            src="https://www.google.com/s2/favicons?domain=www.linkedin.com&sz=128"
            alt="LinkedIn logo"
          />
          <span>{{ copy.linkedin }}</span>
        </a>
        <a class="contact-link" href="#education">
          <span class="contact-emoji" aria-hidden="true">AT</span>
          <span>{{ copy.location }}</span>
        </a>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'

type Language = 'en' | 'de'

const fallbackLanguage = ref<Language>('en')
const language = inject<Ref<Language>>('language', fallbackLanguage)

const logos = {
  respory: 'https://www.google.com/s2/favicons?domain=www.respory.com&sz=128',
  tmc: 'https://external-content.duckduckgo.com/ip3/www.tmconnected.com.ico',
  peneder: 'https://www.google.com/s2/favicons?domain=www.peneder.com&sz=128',
  codingContest: 'https://www.google.com/s2/favicons?domain=codingcontest.org&sz=128',
  countIt: 'https://www.google.com/s2/favicons?domain=countit.at&sz=128',
  htl: 'https://www.google.com/s2/favicons?domain=htl-neufelden.at&sz=128',
  europagym: 'https://www.europagym.at/wordpress/wp-content/uploads/2025/10/Logo-hell_Gimp-300x300.png',
}

const translations = {
  en: {
    eyebrow: 'Business Engineer Portfolio',
    heroTitle: "Hi, I'm Martin Preinsberger - Student at HTL Neufelden.",
    heroLead:
      'I am a Business Informatics student with hands-on internship experience in edge computing, production planning, and business operations. I combine technical understanding with business thinking to support efficient, data-informed decisions.',
    viewExperience: 'View Experience',
    getInTouch: 'Get In Touch',
    profileAlt: 'Portrait of Martin Preinsberger',
    metrics: [
      { value: '4', label: 'Professional internships completed/upcoming' },
      { value: '2x', label: 'Edge computing internships at TMC' },
      { value: '2026', label: 'Expected graduation at HTL Neufelden' },
    ],
    aboutTitle: 'About Me',
    aboutBody:
      'I am based in Aschach an der Donau, Upper Austria, and currently study Business Informatics at HTL Neufelden. My goal is to develop as a Business Engineer who can connect operations, technology, and management to create practical improvements in real business environments.',
    skillsTitle: 'Core Skills',
    skills: [
      {
        title: 'Business & Management',
        items: ['Employee Management', 'Business Law', 'Cost Accounting'],
      },
      {
        title: 'Operations Experience',
        items: ['Production planning support', 'Cross-team collaboration', 'Structured problem solving'],
      },
      {
        title: 'Technology Focus',
        items: ['Edge computing internship projects', 'Business informatics foundation', 'Data-informed decision mindset'],
      },
    ],
    experienceTitle: 'Experience',
    experience: [
      {
        company: 'Respory',
        href: 'https://www.respory.com/',
        logo: logos.respory,
        logoAlt: 'Respory logo',
        title: 'Software Engineer Intern',
        detail: 'Upcoming - July 2026 to August 2026',
        outcome: 'Upcoming software engineering internship.',
      },
      {
        company: 'Track Machines Connected',
        href: 'https://www.tmconnected.com/',
        logo: logos.tmc,
        logoAlt: 'Track Machines Connected logo',
        title: 'Edge Computing Intern',
        detail: 'Linz, Upper Austria, Austria - July 2025 (1 month)',
        outcome: 'Focused on edge computing topics in an industrial setting.',
      },
      {
        company: 'Track Machines Connected',
        href: 'https://www.tmconnected.com/',
        logo: logos.tmc,
        logoAlt: 'Track Machines Connected logo',
        title: 'Edge Computing Intern',
        detail: 'Linz, Upper Austria, Austria - July 2024 (1 month)',
        outcome: 'Supported practical digital and technical use cases.',
      },
      {
        company: 'Peneder Gruppe',
        href: 'https://www.peneder.com/de-at/',
        logo: logos.peneder,
        logoAlt: 'Peneder Gruppe logo',
        title: 'Production Planning and Control Intern',
        detail: 'Fraham, Upper Austria, Austria - July 2023 (1 month)',
        outcome: 'Contributed to planning and operational coordination activities.',
      },
    ],
    contestsTitle: 'Contests',
    contests: [
      {
        company: 'Cloudflight Coding Contest',
        href: 'https://codingcontest.org/',
        logo: logos.codingContest,
        logoAlt: 'Cloudflight Coding Contest logo',
        date: '10/2024',
        title: 'Cloudflight Coding Contest 40th Edition',
        outcome: '',
        location: 'Linz',
      },
      {
        company: 'COUNT IT',
        href: 'https://www.countit.at/',
        logo: logos.countIt,
        logoAlt: 'COUNT IT logo',
        date: '02/2025',
        title: 'Programmier-Challenge CountIT',
        outcome: 'HTL Neufelden 2025, third place',
        location: 'Neufelden',
      },
      {
        company: 'HTL Neufelden',
        href: 'https://www.htl-neufelden.at/',
        logo: logos.htl,
        logoAlt: 'HTL Neufelden logo',
        date: '05/2026',
        title: 'Leistungsschau 2026 HTL Neufelden',
        outcome: '1st place in Business Informatics, judged by an independent business jury',
        location: 'Neufelden',
      },
    ],
    educationTitle: 'Education',
    education: [
      {
        number: '01',
        name: 'Europagymnasium Auhof',
        href: 'https://www.europagym.at/',
        logo: logos.europagym,
        logoAlt: 'Europagymnasium Auhof logo',
        detail: 'Physical Sciences - 2017 to 2021',
      },
      {
        number: '02',
        name: 'HTL Neufelden',
        href: 'https://www.htl-neufelden.at',
        logo: logos.htl,
        logoAlt: 'HTL Neufelden logo',
        detail: 'Business Informatics - September 2021 to May 2026',
      },
    ],
    contactTitle: 'Contact',
    contactBody:
      'Open to internships, project collaboration, and entry-level opportunities in business engineering and business informatics.',
    linkedin: 'LinkedIn Profile',
    location: 'Aschach an der Donau, Upper Austria, Austria',
  },
  de: {
    eyebrow: 'Business-Engineer-Portfolio',
    heroTitle: 'Hallo, ich bin Martin Preinsberger - Schüler an der HTL Neufelden.',
    heroLead:
      'Ich bin Betriebsinformatik-Schüler mit praktischer Praktikumserfahrung in Edge Computing, Produktionsplanung und betrieblichen Abläufen. Ich verbinde technisches Verständnis mit wirtschaftlichem Denken, um effiziente und datenbasierte Entscheidungen zu unterstützen.',
    viewExperience: 'Erfahrung ansehen',
    getInTouch: 'Kontakt aufnehmen',
    profileAlt: 'Porträt von Martin Preinsberger',
    metrics: [
      { value: '4', label: 'Absolvierte/bevorstehende Berufspraktika' },
      { value: '2x', label: 'Edge-Computing-Praktika bei TMC' },
      { value: '2026', label: 'Voraussichtlicher Abschluss an der HTL Neufelden' },
    ],
    aboutTitle: 'Über mich',
    aboutBody:
      'Ich komme aus Aschach an der Donau in Oberösterreich und besuche derzeit die HTL Neufelden im Zweig Betriebsinformatik. Mein Ziel ist es, mich als Business Engineer weiterzuentwickeln und Abläufe, Technologie und Management so zu verbinden, dass praktische Verbesserungen in Unternehmen entstehen.',
    skillsTitle: 'Kernkompetenzen',
    skills: [
      {
        title: 'Wirtschaft & Management',
        items: ['Mitarbeiterführung', 'Wirtschaftsrecht', 'Kostenrechnung'],
      },
      {
        title: 'Erfahrung in Abläufen',
        items: ['Unterstützung in der Produktionsplanung', 'Teamübergreifende Zusammenarbeit', 'Strukturierte Problemlösung'],
      },
      {
        title: 'Technologischer Fokus',
        items: ['Praktikumsprojekte im Edge Computing', 'Grundlagen der Betriebsinformatik', 'Datenorientiertes Entscheidungsdenken'],
      },
    ],
    experienceTitle: 'Erfahrung',
    experience: [
      {
        company: 'Respory',
        href: 'https://www.respory.com/',
        logo: logos.respory,
        logoAlt: 'Respory Logo',
        title: 'Software-Engineer-Praktikant',
        detail: 'Bevorstehend - Juli 2026 bis August 2026',
        outcome: 'Bevorstehendes Praktikum im Software Engineering.',
      },
      {
        company: 'Track Machines Connected',
        href: 'https://www.tmconnected.com/',
        logo: logos.tmc,
        logoAlt: 'Track Machines Connected Logo',
        title: 'Edge-Computing-Praktikant',
        detail: 'Linz, Oberösterreich, Österreich - Juli 2025 (1 Monat)',
        outcome: 'Fokus auf Edge-Computing-Themen in einem industriellen Umfeld.',
      },
      {
        company: 'Track Machines Connected',
        href: 'https://www.tmconnected.com/',
        logo: logos.tmc,
        logoAlt: 'Track Machines Connected Logo',
        title: 'Edge-Computing-Praktikant',
        detail: 'Linz, Oberösterreich, Österreich - Juli 2024 (1 Monat)',
        outcome: 'Unterstützung praktischer digitaler und technischer Anwendungsfälle.',
      },
      {
        company: 'Peneder Gruppe',
        href: 'https://www.peneder.com/de-at/',
        logo: logos.peneder,
        logoAlt: 'Peneder Gruppe Logo',
        title: 'Praktikant in Produktionsplanung und -steuerung',
        detail: 'Fraham, Oberösterreich, Österreich - Juli 2023 (1 Monat)',
        outcome: 'Mitarbeit bei Planungs- und Koordinationsaufgaben im Betrieb.',
      },
    ],
    contestsTitle: 'Wettbewerbe',
    contests: [
      {
        company: 'Cloudflight Coding Contest',
        href: 'https://codingcontest.org/',
        logo: logos.codingContest,
        logoAlt: 'Cloudflight Coding Contest Logo',
        date: '10/2024',
        title: 'Cloudflight Coding Contest 40th Edition',
        outcome: '',
        location: 'Linz',
      },
      {
        company: 'COUNT IT',
        href: 'https://www.countit.at/',
        logo: logos.countIt,
        logoAlt: 'COUNT IT Logo',
        date: '02/2025',
        title: 'Programmier-Challenge CountIT',
        outcome: 'HTL Neufelden 2025, dritter Platz',
        location: 'Neufelden',
      },
      {
        company: 'HTL Neufelden',
        href: 'https://www.htl-neufelden.at/',
        logo: logos.htl,
        logoAlt: 'HTL Neufelden Logo',
        date: '05/2026',
        title: 'Leistungsschau 2026 HTL Neufelden',
        outcome: '1. Platz Betriebsinformatik, bewertet durch eine unabhängige Jury aus der Wirtschaft',
        location: 'Neufelden',
      },
    ],
    educationTitle: 'Ausbildung',
    education: [
      {
        number: '01',
        name: 'Europagymnasium Auhof',
        href: 'https://www.europagym.at/',
        logo: logos.europagym,
        logoAlt: 'Europagymnasium Auhof Logo',
        detail: 'Naturwissenschaften - 2017 bis 2021',
      },
      {
        number: '02',
        name: 'HTL Neufelden',
        href: 'https://www.htl-neufelden.at',
        logo: logos.htl,
        logoAlt: 'HTL Neufelden Logo',
        detail: 'Betriebsinformatik - September 2021 bis Mai 2026',
      },
    ],
    contactTitle: 'Kontakt',
    contactBody:
      'Offen für Praktika, Projektzusammenarbeit und Einstiegsmöglichkeiten in Business Engineering und Betriebsinformatik.',
    linkedin: 'LinkedIn Profil',
    location: 'Aschach an der Donau, Oberösterreich, Österreich',
  },
} as const

const copy = computed(() => translations[language.value])
</script>
