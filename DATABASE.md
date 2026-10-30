# Baza danych i konta — etap 1

Przed tą zmianą projekt nie miał bazy ani prawdziwej autoryzacji. PostgreSQL/Supabase były propozycją w specyfikacji, a `bookflow-v1` w localStorage przechowywał demo. Ten klucz nie jest migrowany do kont i nie stanowi dowodu tożsamości.

## Obecna baza

- SQLite, plik `E:\BookFlow\data\bookflow.sqlite`, tworzony przy pierwszym uruchomieniu.
- Silnik `sql.js` uruchamiany **wyłącznie na serwerze**, nie w przeglądarce. Brak konta chmurowego, hasła dostępu do bazy i osobnej usługi DB.
- `users`: UUID, unikalny e-mail (małe litery), nazwa, skrót hasła, czas utworzenia.
- `sessions`: SHA-256 losowego tokenu, FK do użytkownika, czas utworzenia i wygaśnięcia; relacja użytkownik 1:N sesje.
- `schema_migrations`: zastosowane wersje schematu; obecnie wersja 1. Inicjalizacja: `backend/database.mjs`.
- Znaczniki czasu to milisekundy Unix. Parametryzowane zapytania SQL; klucze obce włączone.
- Baza, blokada i tymczasowe pliki są ignorowane przez Git. Nigdy nie dodawaj ich do publicznego repozytorium. Plik DB nie jest szyfrowany: konto systemowe z dostępem do niego może odczytać e-maile i skróty haseł.

To lokalny etap przejściowy. `sql.js` trzyma obraz DB w pamięci i przy każdej zmianie eksportuje go do pliku tymczasowego, synchronizuje i zastępuje plik główny. Błąd zapisu cofa obraz w pamięci i API nie potwierdza sukcesu. Blokada `.lock` uniemożliwia uruchomienie drugiego procesu korzystającego z tego samego pliku. Nie jest to rozwiązanie do wielu instancji ani dużej bazy; przed wdrożeniem należy przejść na PostgreSQL lub natywny sterownik SQLite. Po awarii blokada może pozostać: sprawdź zapisany w niej PID i procesy; usuń ją ręcznie dopiero po upewnieniu się, że żaden serwer nie używa tej bazy.

## Uwierzytelnianie

- Rejestracja: nazwa 2–60 znaków, poprawny składniowo e-mail, hasło 12–128 znaków i powtórzenie hasła w UI. Unikalność e-maila wymusza również baza.
- Hasła: asynchroniczny scrypt, N=32768, r=8, p=3, 16-bajtowa losowa sól, 64-bajtowy klucz; format wersjonowany `scrypt-v1`. Brak haseł jawnych w bazie i logach.
- Logowanie: porównanie stałoczasowe; taki sam komunikat dla nieistniejącego konta i złego hasła. Rejestracja zwraca konflikt zajętego adresu.
- Sesja: losowy token 32 bajty, tylko jego SHA-256 w bazie. Ciasteczko `bookflow_session` z `HttpOnly`, `SameSite=Lax`, `Path=/`, ważne 7 dni bez automatycznego przedłużania. Tożsamość zawsze z sesji serwera, nigdy z localStorage.
- Zmiana hasła wymaga starego hasła, usuwa wszystkie sesje konta i wydaje nową dla bieżącej przeglądarki. Wylogowanie usuwa bieżącą sesję z bazy i ciasteczko.
- Każdy POST sprawdza dokładne Origin i wymaga JSON. Serwer dopuszcza tylko hosty localhost i 127.0.0.1 oraz nasłuchuje na loopback. Brak CORS.
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

Odpowiedzi API mają `Cache-Control: no-store`. Maksymalny JSON: 8 KB. Kody błędów: 400 format, 401 uwierzytelnienie, 403 Origin, 409 zajęty e-mail, 413 rozmiar, 415 typ, 422 walidacja, 429 limit, 500 zapis/serwer. API nigdy nie zwraca skrótu hasła ani tokenu w JSON.

## Co nadal jest demonstracją

Katalog, rozmowy, opinie i oferty nie są jeszcze tabelami bazy. Ich lokalny stan jest rozdzielany kluczem `bookflow-demo:<UUID>` dla konta. To wygodne rozdzielenie widoków, nie bezpieczeństwo danych: ktoś z dostępem do profilu przeglądarki może przeczytać wszystkie te klucze. Nie zapisuj tam poufnych rozmów. Nowe konto zaczyna bez własnych ofert i ulubionych; przykładowy katalog i przykładowa rozmowa pozostają.

Brak jeszcze weryfikacji własności e-maila, odzyskiwania zapomnianego hasła, usuwania konta, MFA i poczty transakcyjnej. „Zmień hasło” nie jest resetem zapomnianego hasła. Nie ma pozornego przycisku wysyłającego nieistniejącą wiadomość. Kolejny etap: domenowy model ofert i wiadomości w bazie z kontrolą właścicieli, potem weryfikacja/reset e-mail i migracja PostgreSQL przed wdrożeniem.

## Uruchomienie, konfiguracja i kopie

```powershell
cd E:\BookFlow
npm ci
npm run dev
```

Adres: http://127.0.0.1:4174. Używaj konsekwentnie tego adresu: localhost ma inne cookies i localStorage. Brak kont domyślnych. Utwórz własne przez „Zaloguj się” → „Załóż konto”.

Zmienne środowiskowe: `PORT` (domyślnie 4174), `BOOKFLOW_DB` (domyślnie wskazany plik), `COOKIE_SECURE` (domyślnie brak). Serwer nie wczytuje automatycznie pliku `.env`; w PowerShell ustaw np. `$env:PORT = '4174'` przed uruchomieniem.

Kopia: zatrzymaj serwer przez Ctrl+C, skopiuj `data/bookflow.sqlite` w bezpieczne miejsce. Przy odtwarzaniu zatrzymaj serwer, zachowaj kopię obecnej bazy i podmień plik. Kopia zawiera także sesje: po odtworzeniu usuń rekordy `sessions` narzędziem SQLite, zanim ponownie udostępnisz aplikację, aby nie przywrócić unieważnionych sesji. Nigdy nie edytuj bazy zewnętrznym narzędziem przy pracującym serwerze.

Testy `npm test` tworzą osobną tymczasową bazę, testują restart, walidację, duplikat e-maila, złe hasło, Origin, flagi ciasteczka, ważność sesji, wylogowanie, rotację po zmianie hasła i ograniczenie prób. Nie zakładają kont w bazie użytkownika.

Źródła techniczne: [Node.js crypto — scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), [sql.js — Database](https://sql.js.org/documentation/Database.html). Reguły aplikacji opisane powyżej wynikają z jej implementacji.

