# Baza danych, konta i ogłoszenia — etap 2

Pierwszy etap wprowadził bazę kont i sesji. Drugi dodaje rzeczywiste ogłoszenia. PostgreSQL/Supabase pozostają propozycją w specyfikacji. Dawny `bookflow-v1` w localStorage przechowywał demo; nie jest migrowany do kont i nie stanowi dowodu tożsamości.

## Obecna baza

- SQLite, plik `E:\BookFlow\data\bookflow.sqlite`, tworzony przy pierwszym uruchomieniu.
- Silnik `sql.js` uruchamiany **wyłącznie na serwerze**, nie w przeglądarce. Brak konta chmurowego, hasła dostępu do bazy i osobnej usługi DB.
- `users`: UUID, unikalny e-mail (małe litery), nazwa, skrót hasła, czas utworzenia.
- `sessions`: SHA-256 losowego tokenu, FK do użytkownika, czas utworzenia i wygaśnięcia; relacja użytkownik 1:N sesje.
- `schema_migrations`: zastosowane wersje schematu; obecnie wersja 2. Migracja dodaje puste tabele książek i zdjęć, zachowując konta i sesje. Inicjalizacja: `backend/database.mjs`.
- Znaczniki czasu to milisekundy Unix. Parametryzowane zapytania SQL; klucze obce włączone.
- Baza, blokada i tymczasowe pliki są ignorowane przez Git. Nigdy nie dodawaj ich do publicznego repozytorium. Plik DB nie jest szyfrowany: konto systemowe z dostępem do niego może odczytać e-maile i skróty haseł.

To lokalny etap przejściowy. `sql.js` trzyma obraz DB w pamięci i przy każdej zmianie eksportuje go do pliku tymczasowego, synchronizuje i zastępuje plik główny. Błąd zapisu cofa obraz w pamięci i API nie potwierdza sukcesu. Blokada `.lock` uniemożliwia uruchomienie drugiego procesu korzystającego z tego samego pliku. Nie jest to rozwiązanie do wielu instancji ani dużej bazy; przed wdrożeniem należy przejść na PostgreSQL lub natywny sterownik SQLite. Po awarii blokada może pozostać: sprawdź zapisany w niej PID i procesy; usuń ją ręcznie dopiero po upewnieniu się, że żaden serwer nie używa tej bazy.

## Uwierzytelnianie

- Rejestracja: nazwa 2–60 znaków, poprawny składniowo e-mail, hasło 12–128 znaków i powtórzenie hasła w UI. Unikalność e-maila wymusza również baza.
- Hasła: asynchroniczny scrypt, N=32768, r=8, p=3, 16-bajtowa losowa sól, 64-bajtowy klucz; format wersjonowany `scrypt-v1`. Brak haseł jawnych w bazie i logach.
- Logowanie: porównanie stałoczasowe; taki sam komunikat dla nieistniejącego konta i złego hasła. Rejestracja zwraca konflikt zajętego adresu.
- Sesja: losowy token 32 bajty, tylko jego SHA-256 w bazie. Ciasteczko `bookflow_session` z `HttpOnly`, `SameSite=Lax`, `Path=/`, ważne 7 dni bez automatycznego przedłużania. Tożsamość zawsze z sesji serwera, nigdy z localStorage.
- Zmiana hasła wymaga starego hasła, usuwa wszystkie sesje konta i wydaje nową dla bieżącej przeglądarki. Wylogowanie usuwa bieżącą sesję z bazy i ciasteczko.
- Każde żądanie zmieniające dane (POST, PATCH, DELETE) sprawdza dokładne Origin i wymaga JSON. Serwer dopuszcza tylko hosty localhost i 127.0.0.1 oraz nasłuchuje na loopback. Brak CORS.
- Limitowanie w pamięci: 60 żądań POST/IP/15 min, 10 rejestracji/IP/15 min, 10 prób logowania/adres/15 min, 5 zmian hasła/konto/15 min. Restart zeruje limity; przed publikacją potrzebny trwały/współdzielony limiter.
- Przy HTTP localhost ciasteczko nie ma `Secure`. Opcja `COOKIE_SECURE=1` służy przyszłemu HTTPS, ale sama nie konfiguruje TLS. Nie wystawiaj obecnego serwera publicznie.

## API

| Metoda i adres | Dane / wynik |
|---|---|
| POST `/api/auth/register` | `{name,email,password}` → 201, publiczny użytkownik i cookie |
| POST `/api/auth/login` | `{email,password}` → użytkownik i cookie |
| GET `/api/auth/me` | `{user: {id,name,email,createdAt}}` lub `{user:null}` |
| POST `/api/auth/logout` | `{}` → usunięcie sesji |
| POST `/api/auth/password` | `{currentPassword,newPassword}` → zmiana i rotacja sesji |

Odpowiedzi API mają `Cache-Control: no-store`. Maksymalny JSON: 8 KB dla kont, 16 KB dla ogłoszeń. Kody błędów: 400 format, 401 uwierzytelnienie, 403 Origin lub cudza oferta, 404 brak oferty, 409 zajęty e-mail lub konflikt wersji, 413 rozmiar, 415 typ, 422 walidacja, 429 limit, 500 zapis/serwer. API nigdy nie zwraca skrótu hasła ani tokenu w JSON.

## Książki i przyszłe zdjęcia

Katalog, szczegóły, okładki w banerze oraz własna półka korzystają wyłącznie z danych API, odczytanych z SQLite. Pusta baza daje pusty katalog. Błąd odczytu pokazuje komunikat z ponowieniem; nie ma powrotu do przykładów. Stare oferty z localStorage nie są automatycznie importowane — nie stanowią wiarygodnego dowodu właściciela. Użytkownik wystawia je ponownie po zalogowaniu. Przykłady usunięto zgodnie z przyjętym zakresem.

Tabela `books`:

| Pole SQLite | Pole API / znaczenie |
|---|---|
| `id` | UUID nadawany przez serwer |
| `owner_id` | `owner`; FK do users, zawsze z sesji |
| `title`, `author` | Tytuł i autor, po 1–100 znaków |
| `category`, `condition` | Dotychczasowa kategoria i stan egzemplarza, sprawdzane na serwerze |
| `description` | Opis i wady, 1–1500 znaków |
| `cover_theme`, `cover_art` | `theme`, `art`; kolor i ilustracja okładki zastępczej |
| `cover_kicker`, `cover_subtitle`, `cover_note` | `kicker`, `subtitle`, `note`; podpis autora, tytuł i dopisek na okładce (100/100/200 znaków) |
| `created_at`, `updated_at` | `createdAt`, `updatedAt`; czas w ms, zastępuje sztuczne demo-pole age |
| `version` | Licznik wersji do ochrony przed nadpisaniem ze starej karty |

Nazwa wystawiającego `ownerName` pochodzi z JOIN do users. E-mail, sesje i hasła nie trafiają do publicznego katalogu. Nie ma wymyślonych ocen, miast ani profili. Usunięcie zastępuje dawne lokalne `withdrawn`: rekord jest rzeczywiście usuwany z bazy. Katalog pokazuje także własne oferty, a „Moja półka” filtruje po ID zalogowanego użytkownika.

| Metoda i adres | Dane / wynik |
|---|---|
| GET `/api/books` | Publiczne `{books:[...]}`, od najnowszych |
| GET `/api/books/:id` | Publiczne `{book:{...}}` lub 404 |
| POST `/api/books` | Pola książki → 201, `{book}`; wymaga sesji |
| PATCH `/api/books/:id` | Zmieniane pola i `version` → `{book}`; tylko właściciel |
| DELETE `/api/books/:id` | `{version}` → `{ok:true}`; tylko właściciel |

POST wymaga title, author, category, condition i description. Pola okładki są opcjonalne; domyślnie olive/sun i puste podpisy, które UI zastępuje tytułem oraz autorem. Niedozwolone pola (np. owner, id, daty i photos) są odrzucane. Zmiany i usunięcie wymagają aktualnej wersji; konflikt daje 409. Zapis jest transakcyjny, UI potwierdza go dopiero po sukcesie API. Przed usunięciem jest potwierdzenie w aplikacji. Edycja zachowuje datę publikacji. Wyszukiwanie, kategorie, sortowanie i proste rekomendacje są obliczane w przeglądarce na katalogu pobranym z API; paginacja pozostaje przyszłym rozszerzeniem.

Tabela `book_photos` jest przygotowana pod własne zdjęcia: UUID, book_id (FK z ON DELETE CASCADE), unikalny storage_key, mime_type (JPEG/PNG/WebP), byte_size (do 10 MiB), width, height, alt_text, position (0–4, unikalne w obrębie książki), created_at. Umożliwia do pięciu uporządkowanych zdjęć; pozycja 0 jest przewidziana jako główna. Baza ma przechowywać metadane, a pliki będą poza katalogiem publicznym lub w magazynie obiektowym.

**Upload zdjęć nie jest jeszcze wdrożony.** Nie ma endpointu uploadu ani pola wyboru pliku. Przyszły etap musi dodać sprawdzanie rzeczywistego formatu, ponowne kodowanie/usuwanie EXIF, kontrolę właściciela, bezpieczne podawanie plików oraz sprzątanie plików po usunięciu zdjęcia/oferty. Obecne usuwanie kaskadowe dotyczy metadanych. Zdjęcia nie są akceptowane jako dowolne URL-e ani base64 w JSON oferty.

## Co nadal jest demonstracją

Ulubione, rozmowy, symulacje wymian i opinie pozostają lokalne pod kluczem `bookflow-local:v2:<UUID>`. Książki i tożsamość nie są zapisywane ani odczytywane z tego klucza. Nie ma rozmów startowych. To lokalna demonstracja, nie komunikacja z innym użytkownikiem. Stare klucze `bookflow-v1` i `bookflow-demo:<UUID>` są ignorowane, ale nie usuwane z przeglądarki.

Brak jeszcze weryfikacji własności e-maila, odzyskiwania zapomnianego hasła, usuwania konta, MFA i poczty transakcyjnej. „Zmień hasło” nie jest resetem zapomnianego hasła. Nie ma pozornego przycisku wysyłającego nieistniejącą wiadomość. Kolejny etap: upload zdjęć oraz model wiadomości i ulubionych w bazie, potem weryfikacja/reset e-mail i migracja PostgreSQL przed wdrożeniem.

## Uruchomienie, konfiguracja i kopie

```powershell
cd E:\BookFlow
npm ci
npm run dev
```

Adres: http://127.0.0.1:4174. Używaj konsekwentnie tego adresu: localhost ma inne cookies i localStorage. Brak kont domyślnych. Utwórz własne przez „Zaloguj się” → „Załóż konto”.

Zmienne środowiskowe: `PORT` (domyślnie 4174), `BOOKFLOW_DB` (domyślnie wskazany plik), `COOKIE_SECURE` (domyślnie brak). Serwer nie wczytuje automatycznie pliku `.env`; w PowerShell ustaw np. `$env:PORT = '4174'` przed uruchomieniem.

Kopia: zatrzymaj serwer przez Ctrl+C, skopiuj `data/bookflow.sqlite` w bezpieczne miejsce. Przy odtwarzaniu zatrzymaj serwer, zachowaj kopię obecnej bazy i podmień plik. Kopia zawiera także sesje: po odtworzeniu usuń rekordy `sessions` narzędziem SQLite, zanim ponownie udostępnisz aplikację, aby nie przywrócić unieważnionych sesji. Nigdy nie edytuj bazy zewnętrznym narzędziem przy pracującym serwerze.

Testy `npm test` tworzą osobną tymczasową bazę, testują restart, walidację, duplikat e-maila, złe hasło, Origin, flagi ciasteczka, ważność sesji, wylogowanie, rotację po zmianie hasła i ograniczenie prób. Testy ogłoszeń dodatkowo sprawdzają migrację v1 → v2, CRUD i odczyt po restarcie, dwa konta, ochronę właściciela, walidację, konflikty wersji, publiczny zakres danych i relację zdjęć. Nie zakładają kont w bazie użytkownika.

