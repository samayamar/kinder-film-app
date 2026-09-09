# 🎬 Kinder-Film-Analyzer

Filmanalyse für empfindliche Kinder — schnell, praktisch, datenschutzfreundlich.

**Live-Demo:** [Wird nach Deployment gehostet]

---

## ⚡ Schnellstart (5 Minuten)

### 1. Repository klonen
```bash
git clone <repo-url>
cd kinder-film-app
npm install
```

### 2. Environment vorbereiten
```bash
cp .env.example .env.local
```
Öffne `.env.local` und ersetze `your_api_key_here` mit deinem [Anthropic API-Key](https://console.anthropic.com).

### 3. Lokal entwickeln
```bash
npm run dev
```
Öffne http://localhost:3000 im Browser.

### 4. Production-Build
```bash
npm run build
npm start
```

---

## 🚀 Deployment auf Vercel (60 Sekunden)

### Variante A: GitHub + Vercel (empfohlen)
1. Push dein Projekt zu GitHub
2. Gehe zu [vercel.com](https://vercel.com) → New Project
3. Importiere dein GitHub-Repo
4. Unter "Environment Variables" füge ein:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Dein tatsächlicher API-Key
5. Deploy-Button klicken → **Live in 30 Sekunden**

### Variante B: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel env add ANTHROPIC_API_KEY
vercel
```

---

## 📁 Projekt-Struktur

```
kinder-film-app/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # Claude API-Integration
│   ├── layout.tsx                 # Root Layout
│   ├── page.tsx                   # Haupt-UI (Client)
│   └── globals.css                # Tailwind Styles
├── package.json
├── tailwind.config.ts
├── postcss.config.js
└── .env.example
```

---

## 🔧 Wie es funktioniert

### Input
```
Alter: 4 oder 7
Filmname: z.B. "Frozen"
```

### Process
1. **Frontend** sendet Request an `/api/analyze`
2. **API-Route** ruft Claude-API mit optimierter Prompt auf
3. Claude antwortet mit strukturiertem JSON (Tabelle, Scores, Szenen-Warnungen)
4. **Frontend** rendert kompakte Analyse in <2 Sekunden

### Output (kompakt)
- ✅ Score-Tabelle (5 Kategorien)
- 🎯 Ampel-Bewertung (🟢🟡🔴)
- ⏭️ Top 3 kritische Szenen mit Eltern-Scripts
- 💡 Konkrete Handlungsempfehlungen

---

## 💰 Kosten

- **Hosting:** €0 (Vercel Free Tier)
- **Claude API:** ~€0,50–2,00 pro Monat (bei ~100–500 Analysen)
  - Pro Anfrage: ~50 Tokens Input, ~400 Tokens Output
  - Sonnet 4.6: $3/1M Input Tokens, $15/1M Output Tokens

---

## 🚦 v1 Features (gelauncht)

- ✅ Kompakte Filmanalyse (Tabelle + Ampel + Top-3-Szenen)
- ✅ Deutsch-only
- ✅ Keine Anmeldung/Authentication
- ✅ Mobil-optimiert
- ✅ Live auf Vercel deploybar

---

## 📋 v2 Roadmap (nicht in v1)

- [ ] Anmeldung + Favoriten speichern
- [ ] Multi-Language (Englisch, Französisch)
- [ ] Kind-Profil: Spezifische Ängste → bessere Empfehlungen
- [ ] Export als PDF
- [ ] Filmtips basierend auf Kind-Alter & Ängste

---

## ⚙️ Technologie-Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Next.js 14 (API Routes)
- **AI:** Claude Sonnet 4.6 (via Anthropic SDK)
- **Deployment:** Vercel
- **Runtime:** Node.js 18+

---

## 🐛 Troubleshooting

### "Error: ANTHROPIC_API_KEY is not set"
- `.env.local` prüfen: Muss `ANTHROPIC_API_KEY=sk-...` enthalten
- Dev-Server neu starten nach .env-Änderung

### "Film nicht in meiner Datenbank"
- Claude kennt neuere Filme manchmal nicht
- Workaround: Filmname + Erscheinungsjahr eingeben (z.B. "Frozen 2013")

### Timeout bei langen Analysen
- API-Limits bei Vercel Free: 10s Timeout
- Production-Plan nutzen wenn nötig (überschüssig für diese App)

---

## 📝 License

MIT

---

**Fragen?** Kontaktiere [Pedro].
