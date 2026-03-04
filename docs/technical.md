# DMS Admin - Documentație Tehnică

Acest document conține detalii tehnice despre arhitectura, configurația și fluxul de lucru al aplicației DMS Admin. Va fi actualizat periodic pe măsură ce aplicația evoluează.

## 1. Arhitectură și Tehnologii
* **Frontend:** Next.js 14+ (App Router), React, TypeScript.
* **Stilizare:** CSS Vanilla (`globals.css`), pentru control maxim și flexibilitate fără framework-uri grele.
* **Backend API:** Route Handlers din Next.js (`/api/...`).
* **Bază de date:** SQL Server, conectare nativă via `mssql`.
* **Securitate Endpoint-uri:** Middleware / funcții utilitare (`lib/auth.ts`) pentru validarea accesului (ex: `requireDomainAdmin`).

## 2. Configurație Medii și Baze de Date
Variabilele de mediu sunt gestionate prin fișierele `.env.local` (exclus din Git).

**Conexiunea la Baza de Date de Producție (Securizată):**
* **Server:** `ssi-prod-sqldb.intern.anre`
* **Port:** `1433`
* **Bază de date:** `dms_prod`
* **Schema utilizată predominant:** `DMS`
* **Cont de conectare:** `dms_readonly` (Ofertă drepturi clare doar de `SELECT` prin `GRANT SELECT ON SCHEMA::DMS TO dms_readonly`). Acest lucru asigură că vulnerabilitățile aplicației nu pot duce la modificarea accidentală sau malițioasă a datelor de producție din tabelele sensibile precum `DMS.UTILIZATORI` sau `DMS.TERT`.

## 3. Structura Proiectului
* `/src/app/` - Conține paginile aplicației (interfața vizuală) organizate pe module:
  * `/users` - Gestionarea utilizatorilor și a asocierilor TERT.
  * `/companies` - Gestionarea companiilor (Persoane Juridice).
  * `/roles` - Gestionarea rolurilor.
  * `/notifications` - Vizualizarea log-urilor de email din `AUTO_EMAILS`.
  * `/cleanup` - Utilitar pentru curățarea duplicatelor.
* `/src/app/api/` - Conține backend-ul (API-urile RESTful), răspunzând la cererile HTTP trimise de pagini.
* `/src/lib/` - Fișiere comune: conexiune DB (`db.ts`), metode de utilitate și tipuri TypeScript (`types.ts`).

## 4. Logica de Căutare (Backend)
Funcția de căutare din API (ex: `api/users/route.ts`) implementează căutare multi-câmp folosind clauze `LIKE` cu wildcard implicit (`%valoare%`):
* Căutarea după **Email** și **Username** se face pe modul wildcard total, returnând potriviri parțiale.
* Sistemul asociază entitățile `UTILIZATORI` (reprezentând contul de login) cu entitățile `TERT` (reprezentând datele legale de client). Conexiunea se face prin `ID_TERT`. Din interfață și din API, diferențierea între Persoane Fizice și Persoane Juridice se face determinând existența câmpurilor `TERT_CNP` vs `TERT_CUI`.

## 5. Deployment și Versionare
* **Git Repository:** GitHub `lamihai77/dms`
* Credențialele (`.env.local`) sunt excluse strict prin `.gitignore`. Orice deployment trebuie să seteze aceste variabile de mediu individual pe serverul gazdă (IIS cu iisnode, Docker, etc).
