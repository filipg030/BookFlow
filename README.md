# BookFlow — lokalna aplikacja

Etap 1 przejścia z demo: rzeczywiste konta na backendzie Node.js i bazie SQLite. Szczegóły schematu, bezpieczeństwa, API, konfiguracji, kopii i ograniczeń: [DATABASE.md](DATABASE.md).

## Uruchomienie

Wymagany Node.js >=20.

```powershell
cd E:\BookFlow
npm ci
npm run dev
```

Domyślny adres: http://127.0.0.1:4174. Port 4173 był używany przez stary serwer demo bez API kont — nie korzystaj z niego. Jeśli aktualny serwer już działa, otwórz jego adres zamiast uruchamiać drugi proces. Można uruchomić tylko jeden proces korzystający z tej samej bazy.

## Co działa rzeczywiście

- Rejestracja przez imię, e-mail i hasło (12–128 znaków).
- Logowanie, sesja utrzymywana przez 7 dni i wylogowanie po stronie serwera.
- Zmiana hasła z unieważnieniem pozostałych sesji.
- Konto zapisywane w `data/bookflow.sqlite`, bez kont domyślnych i haseł jawnych.
- Walidacja i limity prób na backendzie, kontrola pochodzenia żądań.

Utwórz konto przez „Zaloguj się” → „Załóż konto”. Stare logowanie demo nie jest kontem i nie zostaje przeniesione. Weryfikacja adresu i odzyskiwanie zapomnianego hasła przez e-mail nie są jeszcze wdrożone.

## Co nadal jest demonstracją

Katalog, rekomendacje, ulubione, własne oferty, chat, wymiany i opinie. Lokalny stan jest rozdzielony kluczem `bookflow-demo:<UUID>`, lecz nie jest synchronizowany ani chroniony jak dane serwerowe. Rozmowy nie docierają do prawdziwych osób. Okładki są generowane z CSS. Nowe konta nie dziedziczą cudzych ofert ani danych starego `bookflow-v1`.

Brak dostaw, kurierów, płatności i deploymentu. Google Fonts jest opcjonalnym zasobem sieciowym; bez sieci działają fonty zastępcze. Nie wystawiaj tej wersji publicznie: baza i konta są pierwszym etapem, nie kompletnym systemem produkcyjnym.

## Pliki

- `public/` — interfejs, lokalny stan demo, dane katalogu i style.
- `server.mjs` — lokalny HTTP i routing API.
- `backend/auth.mjs` — konta, hasła, sesje i limity.
- `backend/database.mjs` — baza i inicjalizacja schematu.
- `data/` — prywatne dane ignorowane przez Git.
- `tests/` — testy katalogu i integracyjne testy kont z osobną bazą tymczasową.

```powershell
npm run check
npm test
```

Następny etap: przeniesienie ofert i rozmów do bazy z autoryzacją użytkowników, następnie poczta i przygotowanie infrastruktury produkcyjnej.

