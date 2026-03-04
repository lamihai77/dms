# DMS Admin — ANRE

Aplicație web internă pentru administrarea utilizatorilor și companiilor din baza de date DMS.

## Stack
- **Frontend**: Next.js 15 + React + TypeScript
- **Backend**: Next.js API Routes
- **Database**: Microsoft SQL Server (`dms_prod`)
- **Auth**: Windows Authentication via IIS (Domain Admins)

## Funcționalități
- 👤 **Utilizatori** — Căutare (email/CNP/username), editare, activare/dezactivare
- 📧 **Notificări** — Verificare log email-uri trimise
- 🔑 **Roluri** — Management roluri per utilizator
- 🏢 **Companii** — Căutare TERT (CUI/denumire), licențe, date fiscale
- 🧹 **Curățare** — Detectarea și rezolvarea companiilor duplicate (CUI)

## Dezvoltare Locală

```bash
npm install
npm run dev
```

Aplicația va rula la http://localhost:3000

## Deploy pe Server (IIS)

```bash
npm run build
# Copiază .next/standalone/ pe server
# Configurează IIS cu iisnode sau reverse proxy
```

## Variabile de Mediu

Copiază `.env.local` și completează:
- `DB_SERVER` — SQL Server hostname
- `DB_PORT` — Port (default: 1443)
- `DB_NAME` — Database name (default: dms_prod)
- `DB_USER` / `DB_PASSWORD` — Credențiale SQL (dacă nu folosești Windows Auth)

## Securitate
- Acces restricționat la grupul `INTERN\Domain Admins`
- Parameterized queries (prevenire SQL Injection)
- Audit trail pe toate modificările
- HTTPS obligatoriu în producție
