# BookFlow — lokalna aplikacja

Konta oraz katalog i ogłoszenia działają na backendzie Node.js z bazą SQLite. Szczegóły schematu, bezpieczeństwa, API, konfiguracji, kopii i ograniczeń: [DATABASE.md](DATABASE.md).

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
- Katalog pobierany wyłącznie z bazy, bez przykładowych książek.
- Dodawanie, edycja i usuwanie własnych ogłoszeń w bazie, z kontrolą właściciela i wersji.
- Wyszukiwanie, kategorie, sortowanie i okładki zastępcze na podstawie rzeczywistych ogłoszeń.
- Schemat metadanych zdjęć przygotowany pod przyszły upload (przesyłanie zdjęć jeszcze niedostępne).

Utwórz konto przez „Zaloguj się” → „Załóż konto”. Stare logowanie demo nie jest kontem i nie zostaje przeniesione. Weryfikacja adresu i odzyskiwanie zapomnianego hasła przez e-mail nie są jeszcze wdrożone.

## Co nadal jest demonstracją

Ulubione, chat, wymiany i opinie. Lokalny stan jest rozdzielony kluczem `bookflow-local:v2:<UUID>`, lecz nie jest synchronizowany ani chroniony jak dane serwerowe. Książki nie są przechowywane w localStorage. Rozmowy nie docierają do prawdziwych osób. Okładki są generowane z CSS. Stare przykłady i oferty z localStorage nie są importowane. Katalog będzie pusty, dopóki użytkownicy nie dodadzą własnych książek.

Brak dostaw, kurierów, płatności i deploymentu. Google Fonts jest opcjonalnym zasobem sieciowym; bez sieci działają fonty zastępcze. Nie wystawiaj tej wersji publicznie: baza i konta są pierwszym etapem, nie kompletnym systemem produkcyjnym.

## Pliki

- `public/` — interfejs, klient API, filtry katalogu i style.
- `server.mjs` — lokalny HTTP i routing API.
- `backend/auth.mjs` — konta, hasła, sesje i limity.
- `backend/database.mjs` — baza i migracje schematu.
- `backend/books.mjs` — katalog i zarządzanie ogłoszeniami.
- `backend/http.mjs` — odczyt JSON, odpowiedzi API i kontrola Origin.
- `data/` — prywatne dane ignorowane przez Git.
- `tests/` — testy katalogu, kont, ogłoszeń i migracji z osobną bazą tymczasową.

```powershell
npm run check
npm test
```

Po aktualizacji zatrzymaj stary serwer (Ctrl+C) i uruchom `npm run dev` ponownie. Migracja bazy do wersji 2 wykona się automatycznie i zachowa konta.

Następny etap: przesyłanie zdjęć oraz przeniesienie rozmów i ulubionych do bazy, następnie poczta i infrastruktura produkcyjna.

