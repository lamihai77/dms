# Ghid de Utilizare a Platformei DMS Admin

Platforma **DMS Admin** este interfața centrală prin care personalul administrativ poate vizualiza și gestiona permisiunile, conturile și asocierile clienților din sistemul DMS.

Această aplicație oferă acces direct și securizat la informațiile din platforma principală, organizate în moduri intuitive pentru a ușura sarcinile de suport și mentenanță.

---

## 🏗️ Organizarea Platformei

Meniul din stânga îți oferă acces rapid la cele 5 mari secțiuni ale platformei:

### 1. 👤 Utilizatori
Secțiunea dedicată vizualizării conturilor individuale de persoană care accesează sistemul.
* **Căutare Avansată:** Poți căuta o persoană după *Email, Nume, CNP* sau *Username*. Funcția de căutare este flexibilă: dacă dorești toți utilizatorii cu adrese de pe un anumit domeniu, scrie pur și simplu `@domeniu.ro` în câmpul de Email și apasă *Caută*.
* **Semnificația Statusurilor pe ecran:**
  * **Tip (PF/PJ):** Îți arată vizual dacă acel utilizator este o simplă persoană fizică sau reprezintă o Companie / Instituție Juridică.
  * **Status (Butonul On/Off):** Indică dacă contul persoanei este activ, adică are drept să se logheze pe site-ul principal. Dacă este "Oprit" (stânga), chiar dacă știe parola, persoana nu poate intra.
  * **Locked (OK / Blocat):** Reprezintă blocarea automată din motive de securitate (ex: a greșit parola de prea multe ori consecutiv). Un utilizator "Blocat" are nevoie de intervenția unui operator din această platformă pentru a-i debloca lacătul.

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
