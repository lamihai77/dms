# Ghid de Utilizare a Platformei DMS Admin

Platforma **DMS Admin** este interfața centrală prin care personalul administrativ poate vizualiza și gestiona permisiunile, conturile și asocierile clienților din sistemul DMS.

Această aplicație oferă acces direct și securizat la informațiile din platforma principală, organizate în moduri intuitive pentru a ușura sarcinile de suport și mentenanță.

---

## 🏗️ Organizarea Platformei

Meniul din stânga îți oferă acces rapid la cele 5 mari secțiuni ale platformei:

### 1. 👤 Utilizatori
Secțiunea dedicată vizualizării conturilor individuale de persoană care accesează sistemul.
* **Căutare Universală:** Nu mai este nevoie să selectezi ce anume cauți. Poți introduce direct în caseta de căutare orice fragment de: *Nume, Email, CUI, CNP* sau *Username*. Sistemul va căuta simultan în toate câmpurile și îți va returna cele mai bune potriviri. 
* **Categorisire (Tab-uri):** Poți filtra rapid rezultatele folosind tab-urile:
  - **Toți**: Toate rezultatele căutării.
  - **AD**: Doar utilizatorii care provin din Active Directory.
  - **Persoane Fizice**: Doar conturile asociate cu un CNP.
  - **Persoane Juridice**: Conturile asociate cu o companie (CUI). Această vizualizare îți arată coloane suplimentare specifice: *Județ, Localitate* și *Numărul de subconturi*.
* **Semnificația Statusurilor pe ecran:**
  - **Status (Badge-uri colorate):** 
    - <span style="color: green; font-weight: bold;">Activ</span>: Contul are permisiunea de a se loga.
    - <span style="color: red; font-weight: bold;">Inactiv</span>: Contul este suspendat administrativ.
  - **Identitate:** Câmpul "Denumire" combină acum Numele și Prenumele pentru o citire mai ușoară.

### 2. 🏢 Companii (TERT)
Locul unde vizualizezi datele entităților legale (Persoane Juridice și asocierile oficiale). Spre deosebire de meniul *Utilizatori* (care se referă la conturi logabile), aici vei vedea datele firmei, CUI-ul, și setările lor specifice la nivel de companie mamă.

### 3. 📧 Notificări Email
(În curs de integrare totală) - Aici vei putea vedea rapoarte (log-uri) cu toate e-mailurile trimise în mod automat de către platforma DMS către utilizatori (ex: link-uri de resetare parolă, validări de cont etc).

### 4. 🔑 Roluri
Vizualizarea grupurilor de permisiuni. Aici poți vedea ce niveluri de acces există în sistem și ce funcționalități din aplicația mare sunt deblocate pentru fiecare categorie de angajat sau client.

### 5. 🧹 Curățare Duplicate
Un instrument special de mentenanță a bazei de date. Te ajută să identifici, analizezi și să îmbini conturile sau companiile dublate în sistem din varii motive istorice.

---

## 🔒 Aspecte de Securitate
* Toate acțiunile tale în această platformă (modificări de conturi, activări/dezactivări) sunt înregistrate în baza de date la "Modificat de: Numele Tau" pentru o trasabilitate clară de audit.
* Platforma poate impune limitări de vizualizare sau editare în funcție de grupul tău de securitate din firmă. Anumite câmpuri pot apărea indisponibile ("Read-Only") dacă nu deții rolul de Administrator Suprem.
