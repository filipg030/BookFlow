# BookFlow — specyfikacja biznesowa i techniczna MVP

Wersja: 1.0 • Data: 26.10.2026 • Status: propozycja do uzgodnienia przed implementacją.

Dokument obejmuje siedem wymaganych funkcjonalności oraz proces wymiany i generowania etykiet wskazany w wymaganym User Flow. Nie stanowi zatwierdzenia założeń biznesowych. Propozycje dodatkowych funkcji znajdują się wyłącznie na końcu; nie uwzględniono ich w modelu danych, API, kosztach ani harmonogramie MVP.

## 1. Cel biznesowy i granice produktu

BookFlow pomaga znaleźć interesującą książkę, uzgodnić wymianę z jej właścicielem i bezpiecznie przejść od rozmowy do wysyłki. Wartością produktu jest ponowne wykorzystanie książek oraz zaufanie wynikające z historii zakończonych wymian.

Główne grupy odbiorców: czytelnicy wymieniający literaturę popularną oraz osoby wymieniające podręczniki. Pierwszą grupę i obszar pilotażu trzeba wybrać przed startem, aby zgromadzić wystarczającą liczbę pasujących ofert.

### Założenia robocze do zatwierdzenia

| Obszar | Proponowany wariant MVP |
|---|---|
| Rynek i język | Polska, język polski, wyłącznie krajowe przesyłki |
| Model wymiany | Jedna fizyczna książka za jedną fizyczną książkę, między dwiema osobami |
| Pieniądze | Bez sprzedaży książek, dopłat za książkę, portfela i punktów |
| Wysyłka | Jeden operator; dwie osobne przesyłki A→B i B→A |
| Finansowanie pilotażu | Operator BookFlow opłaca etykiety z własnego konta przewoźnika, z limitem budżetu; wymaga akceptacji właściciela produktu |
| Przeglądanie | Dostępne bez konta; chat, zapis, publikacja i wymiana po zalogowaniu i potwierdzeniu e-maila |
| Sukces wymiany | Obaj uczestnicy potwierdzili otrzymanie uzgodnionej książki |
| Monetyzacja | Brak opłat platformowych w pilotażu; późniejszy model biznesowy do osobnej decyzji |

Wariant finansowania przez platformę pozwala opisać kompletny proces etykiety bez zakładania niezamówionej integracji płatności. Jeżeli każdy użytkownik ma płacić za własną wysyłkę w BookFlow, przed implementacją należy rozszerzyć specyfikację o płatności, rozliczenia i zwroty. Samo wygenerowanie PDF nie zastępuje zakupu usługi przewozowej.

Poza MVP: aplikacje natywne, wymiany wielostronne i pakietowe, sprzedaż, dopłaty, płatności użytkowników, wiele firm kurierskich i funkcje z końcowej listy. Podstawowe zdjęcia i deklaracja stanu są częścią ogłoszenia; nie oznaczają niezależnej weryfikacji książki.

### Mierniki i ekonomika

Główny miernik: liczba obustronnie zakończonych wymian tygodniowo. Pomocniczo: odsetek nowych kont publikujących ofertę w ciągu 7 dni, przejście wyszukiwanie→szczegóły→chat→zaakceptowana wymiana→zakończenie, mediana czasu pierwszej odpowiedzi i czas znalezienia partnera. Dodatkowo: udział pustych wyszukiwań, anulowań, problemów z wysyłką oraz koszt zakończonej wymiany.

Proponowane hipotezy pilotażu, nie prognozy: co najmniej 25% nowych użytkowników publikuje ofertę w 7 dni, co najmniej 60% zaakceptowanych wymian kończy się obustronnym odbiorem. Ocena po minimum 50 zaakceptowanych wymianach, z podaniem liczebności próby. Cele należy skalibrować po pilotażu.

Koszt miesięczny = hosting + baza i kopie + zdjęcia i transfer + poczta + monitoring + obsługa użytkowników + opłacone przesyłki. Dla N wymian koszt przewozu wynosi w przybliżeniu 2 × N × cena jednej przesyłki, powiększona o nieodzyskane koszty anulowań. Taryfy, limity i koszt wsparcia należy wycenić przed ustaleniem budżetu; dokument nie zakłada darmowej infrastruktury produkcyjnej.

## 2. Zakres funkcjonalny i kryteria akceptacji

| ID | Funkcja | Zakres i kryterium akceptacji |
|---|---|---|
| F01 | Konto i logowanie | E-mail + hasło, potwierdzenie adresu, reset hasła, wylogowanie. Niepotwierdzone konto nie publikuje i nie wysyła wiadomości. Reset nie ujawnia, czy konto istnieje; wygasły link ma czytelny komunikat. Powrót po logowaniu do rozpoczętej czynności. |
| F02 | Profil i opinie | Publiczne: nazwa, opcjonalny avatar i opis, aktywne oferty, średnia ocen 1–5, liczba ocen i zakończonych wymian. Bez ocen: „Brak opinii”. Jedna opinia autora o partnerze na zakończoną wymianę; bez oceniania siebie. Komentarz opcjonalny, do 1000 znaków. |
| F03 | Strona główna | Rekomendacje i filtry kategorii, m.in. podręczniki, thriller, romans. Stan początkowy dla nowych kont, brak wyników i błąd ładowania. Własne i niedostępne książki wyłączone z rekomendacji. |
| F04 | Chat | Prywatna rozmowa dwóch uczestników przy konkretnej ofercie, historia, czas wysłania, licznik nieprzeczytanych. Tekst do 4000 znaków, bez plików i połączeń. Po ponownym połączeniu historia uzupełnia braki bez duplikatów. Osoba trzecia nie odczyta rozmowy ani przez API, ani przez realtime. |
| F05 | Wyszukiwarka | Osobne pola tytułu i autora oraz pole ogólne; wyszukiwanie bez rozróżniania wielkości liter i polskich znaków. Łączenie filtrów, stabilne sortowanie i paginacja. Dopasowania dokładne przed częściowymi; sugestie literówek wyraźnie oddzielone. |
| F06 | Kreator oferty | Szkic → dane książki → stan i zdjęcia → podgląd → publikacja. Wymagane: tytuł, co najmniej jeden autor, główna kategoria, język, stan, opis wad, minimum jedno zdjęcie własnego egzemplarza. Opcjonalny ISBN i rok wydania. Właściciel edytuje i wycofuje dostępną ofertę; nie zmienia przedmiotu zaakceptowanej wymiany. |
| F07 | Ulubione | Dodanie i usunięcie zapisu, prywatna lista z paginacją. Wielokrotne kliknięcie nie tworzy duplikatów. Niedostępna oferta zachowuje informację o statusie; usunięta jest prezentowana jako niedostępna bez ujawnienia usuniętych treści. |
| F08 | Uzgodnienie wymiany | Z chatu użytkownik proponuje własną dostępną książkę. Druga strona akceptuje lub odrzuca. Akceptacja rezerwuje oba egzemplarze atomowo; konkurencyjna akceptacja tego samego egzemplarza kończy się konfliktem. |
| F09 | Wysyłka i zakończenie | Każdy uczestnik uzupełnia dane, potwierdza warunki i otrzymuje własną etykietę. Powtórzenie żądania nie kupuje kolejnej przesyłki. Dwa potwierdzenia odbioru kończą wymianę i odblokowują opinie. |

F08 i F09 są elementami procesu wymaganymi do realizacji wskazanego User Flow oraz wiarygodnych opinii, a nie dodatkowymi funkcjami z listy rozwojowej.

### Reguły interfejsu

Paleta bazowa: `#42f5a1` jako akcent oraz `#ffffff` jako tło. Proponowany ciemny kolor tekstu: `#14251c`. Przyciski miętowe mają ciemny tekst; białego tekstu na mięcie nie stosować bez sprawdzenia kontrastu. Stany błędów wymagają tekstu i ikony, nie samej zmiany koloru.

Widoki: strona główna/wyniki, szczegóły oferty, publiczny profil, logowanie/rejestracja, własne oferty i kreator, ulubione, chat z kartą wymiany, dane wysyłki i etykieta, ustawienia konta. Projekt responsywny od 360 px; klawiatura, widoczny fokus, etykiety pól, alternatywy tekstowe zdjęć i komunikaty błędów przy polach. Cel jakościowy: WCAG 2.2 AA, weryfikowany podczas projektu i odbioru.

## 3. Proponowany stos technologiczny

| Warstwa | Wybór | Uzasadnienie |
|---|---|---|
| Frontend | Next.js App Router, React, TypeScript | Publiczne strony renderowane na serwerze; interaktywność wyszukiwarki, kreatora i chatu po stronie klienta. Jeden język w całym projekcie. |
| UI i formularze | Tailwind CSS, React Hook Form, Zod | Spójne tokeny kolorów i komponenty, walidacja formularzy i kontraktów wejściowych. Walidacja serwerowa pozostaje obowiązkowa. |
| Backend | Modułowy monolit w Next.js Route Handlers oraz funkcje transakcyjne PostgreSQL | Niewielki koszt utrzymania MVP; moduły kont, ofert, wyszukiwania, rozmów, wymian i wysyłek. Krytyczna akceptacja w jednej transakcji bazy. |
| Zadania asynchroniczne | Osobny worker Node.js z tego samego repozytorium + kolejka zadań w PostgreSQL | Zakup i pobieranie etykiet, ponawianie, sprawdzanie statusów. Długie zadania nie zależą od czasu życia żądania HTTP. |
| Baza | PostgreSQL zarządzany przez Supabase | Relacje i transakcje dla rezerwacji; indeksy tekstowe i RLS. Na start wystarcza bez Elasticsearch i Redis. |
| Tożsamość | Supabase Auth | Obsługa kont i sesji; brak własnej implementacji przechowywania haseł. |
| Chat | Trwałe wiadomości w PostgreSQL + Supabase Realtime Postgres Changes | Realtime sygnalizuje nowe dane; baza pozostaje źródłem historii. Dostęp do rekordów ograniczony politykami RLS. |
| Pliki | Supabase Storage | Zdjęcia ofert w wydzielonym zasobie, etykiety w prywatnym; czasowe adresy do pobrania po sprawdzeniu uprawnień. |
| Poczta | Dostawca poczty transakcyjnej przez SMTP, np. Resend | Weryfikacja e-maila i reset hasła; konfiguracja domeny i dostarczalności przed produkcją. |
| Przesyłki | Proponowany InPost ShipX, do potwierdzenia handlowego i technicznego | Jeden operator dla polskiego pilotażu. Dostęp do konta nadawcy, usług, zakupu i etykiet trzeba zweryfikować w sandboxie. |
| Hosting i utrzymanie | Vercel dla aplikacji; kontener workera w regionie UE; Supabase w regionie UE | Oddzielenie krótkich żądań od trwałego przetwarzania. Regiony, połączenia i umowy dostawców wymagają potwierdzenia. |
| Jakość | Vitest, Playwright, migracje SQL, CI; monitoring np. Sentry | Testy reguł, przepływów i uprawnień; błędy bez treści wiadomości i danych adresowych w logach. |

Wersje zależności: stabilne, wspierane wydania dobrane przy inicjalizacji projektu i zapisane w lockfile. Nie wiązać specyfikacji z niezweryfikowanymi numerami „najnowszych” wersji.

Architektura przepływu: przeglądarka → Next.js API → PostgreSQL; przeglądarka subskrybuje dozwolone zmiany wiadomości przez Realtime. API zapisuje zlecenie wysyłki w transakcji; worker pobiera zadanie, komunikuje się z przewoźnikiem i zapisuje wynik. Etykieta trafia do prywatnego storage. Sekrety przewoźnika i klucz administracyjny nigdy nie trafiają do klienta.

### Wyszukiwanie i rekomendacje

Wyszukiwanie: przechowywane, znormalizowane wersje tytułu i nazw autorów; normalizacja spacji, wielkości liter i diakrytyków, przy zachowaniu oryginalnego zapisu do wyświetlania. Osobne pola tytuł i autor łączone przez AND; kategorie wielokrotnego wyboru przez OR, następnie AND z tekstem. Pole ogólne przeszukuje łącznie tytuł i autorów. Domyślnie wyniki tylko dla dostępnych ofert.

Kolejność: dokładny tytuł/autor → prefiks → fragment; dopiero oddzielna sugestia podobnych wyników z `pg_trgm`. B-tree dla równości i GIN dla dopasowań częściowych. Limit 20 wyników, maksymalnie 50; dla zapytań krótszych niż 2 znaki komunikat zamiast szerokiego skanowania. Podręczniki pokazują rok i wydanie, jeśli podane — podobny tytuł nie gwarantuje tego samego wydania.

Rekomendacje MVP bez uczenia maszynowego: kandydaci to dostępne oferty innych użytkowników. Opcjonalny wybór ulubionych kategorii po rejestracji, możliwy do pominięcia. Ranking `0,60 × zgodność kategorii + 0,25 × zgodność autora + 0,15 × świeżość`, każda składowa w przedziale 0–1. Zgodność kategorii: 1 dla zadeklarowanych preferencji, w przeciwnym razie udział kategorii w zapisach; zgodność autora: udział zapisów zawierających danego autora. Świeżość: `max(0, 1 − wiek_w_dniach/30)`. Brak sygnału oznacza 0. Maksymalnie dwie oferty jednego właściciela w pierwszych dziesięciu wynikach, jeśli istnieją alternatywy. Remis rozstrzyga data publikacji i ID.

Nowe konto bez preferencji: najnowsze oferty z rotacją kategorii. Wynik może zawierać krótkie uzasadnienie, np. „Z kategorii Thriller”. Na start nie śledzimy historii czytania chatu ani nie wykorzystujemy danych adresowych do rekomendacji. Ocenę trafności opieramy na przejściach do oferty, zapisach i rozpoczętych wymianach, a nie na samych kliknięciach.

## 4. Zarys bazy danych i relacji

Identyfikatory UUID, daty `timestamptz` w UTC, prezentacja czasu w strefie użytkownika. Kwoty jako liczba całkowita w groszach i kod waluty. Poniższy model jest logiczny, nie gotową migracją.

| Tabela | Główne pola i relacje |
|---|---|
| `auth.users` | Konto zarządzane przez dostawcę Auth; e-mail i dane uwierzytelniania poza publicznym profilem. |
| `profiles` | `id` PK/FK→auth.users, `display_name`, `avatar_key`, `bio`, `account_status`, `created_at`. |
| `categories` | `id`, unikalny `slug`, `name`, `active`. |
| `user_category_preferences` | `user_id` FK→profiles, `category_id` FK→categories; wspólny PK. |
| `books` | `id`, `title`, `normalized_title`, opcjonalne `isbn`, `edition`, `publication_year`, `language`. Rekord opisuje wydanie; brak ISBN dozwolony. |
| `authors`, `book_authors` | Autor: `id`, `name`, `normalized_name`; łącznik `book_id`, `author_id`, `position`. Relacja wiele-do-wielu. |
| `listings` | `id`, `owner_id` FK→profiles, `book_id` FK→books, `category_id` FK→categories, `condition`, `defects_description`, `description`, `status`, daty, `version`. Jeden rekord = jeden egzemplarz. |
| `listing_images` | `id`, `listing_id` FK, `storage_key`, `position`; maksymalnie 5 zdjęć. |
| `favorites` | `user_id` FK, `listing_id` FK, `created_at`; wspólny PK. |
| `conversations` | `id`, `listing_id` FK, `initiator_id` FK, `owner_id` FK, `created_at`. Unikalna para inicjator+oferta; uczestnicy różni, właściciel zgodny z ofertą. |
| `conversation_reads` | `conversation_id`, `user_id`, `last_read_message_id`; PK rozmowa+użytkownik. Tylko uczestnik rozmowy. |
| `messages` | `id`, `conversation_id` FK, `sender_id` FK, `body`, `client_message_id`, `created_at`. Unikalne nadawca+client_message_id eliminują duplikaty. |
| `exchanges` | `id`, `conversation_id` FK, `proposer_id`, `recipient_id`, `status`, `version`, `accepted_at`, `expires_at`, `completed_at`, `cancel_reason`. |
| `exchange_items` | `exchange_id` FK, `listing_id` FK, `sender_id`, `recipient_id`, `item_snapshot`, `receipt_confirmed_at`. Dokładnie dwa przeciwne kierunki dla zaakceptowanej wymiany. Snapshot utrwala uzgodniony opis i stan. |
| `listing_reservations` | `listing_id` PK/FK, `exchange_id` FK, `created_at`, `expires_at`. Jeden egzemplarz może mieć tylko jedną bieżącą rezerwację. |
| `shipment_details` | `exchange_id`, `user_id`, zaszyfrowane dane nadawcze i odbiorcze, punkt odbioru, telefon/e-mail wymagane przez operatora, `confirmed_at`, `details_version`. Dane prywatne, osobny schemat. |
| `shipments` | `id`, `exchange_id`, `sender_id`, `recipient_id`, `provider`, `provider_shipment_id`, `status`, `tracking_number`, `label_storage_key`, `idempotency_key`, `cost_minor`, `currency`, `provider_purchased_at`, daty i kod błędu. Unikalne wymiana+nadawca oraz provider+provider_shipment_id. |
| `reviews` | `id`, `exchange_id`, `author_id`, `subject_id`, `rating`, `comment`, `created_at`, `visibility`. Unikalne wymiana+autor; ocena 1–5. |
| `exchange_events` | `id`, `exchange_id`, `actor_id`, `event_type`, `metadata`, `created_at`; audyt zmian bez danych adresowych i treści chatu. |
| `jobs`, `provider_events` | Zadania: typ, klucz deduplikacji, status, próby, termin kolejnej próby, blokada workera. Zdarzenia operatora: unikalny identyfikator lub hash, shipment_id, czas i wynik przetworzenia. |

Najważniejsze relacje: użytkownik 1:N oferty; książka 1:N egzemplarze; użytkownicy N:M zapisane oferty; oferta 1:N rozmowy; rozmowa 1:N propozycje wymiany; zaakceptowana wymiana 1:2 przedmioty i 1:2 przesyłki; zakończona wymiana 1:0–2 opinie.

### Niezmienniki i dostęp

- Akceptacja blokuje rekordy obu ofert w stałej kolejności ID; sprawdza dostępność, własność i wersję propozycji, tworzy rezerwacje i aktualizuje stany w jednej transakcji. Pozostałe propozycje dotyczące zajętych egzemplarzy stają się niedostępne do akceptacji.
- Po akceptacji obie pozycje muszą należeć do odpowiednich uczestników, a odbiorca jednej być nadawcą drugiej. Zapewnia to procedura transakcyjna/trigger, nie formularz klienta. Bezpośrednie zapisy omijające procedurę są zabronione.
- Opinia wymaga stanu `completed`, autor jest uczestnikiem, oceniany jest drugim uczestnikiem. Średnia i liczba ocen są obliczane z widocznych opinii, nie przesyłane przez klienta.
- Publiczne są wyłącznie dozwolone pola profili i opublikowanych ofert. Ulubione i dane konta są prywatne. Rozmowy, wiadomości i wymiany dostępne uczestnikom. Etykietę pobiera tylko nadawca danej paczki; dostęp operacyjny wymaga uprawnienia i audytu.
- W schematach wystawionych przez Supabase: RLS i minimalne granty. Worker działa rolą o ograniczonych uprawnieniach; użycie roli administracyjnej wymaga jawnej kontroli dostępu po stronie serwera.
- Indeksy: `listings(status, category_id, created_at, id)`, `listings(owner_id)`, znormalizowane tytuły i autorzy, `messages(conversation_id, created_at, id)`, uczestnicy rozmów/wymian, `jobs(status, run_after)`. Klucze obce indeksowane tam, gdzie obsługują filtrowanie lub usuwanie.
- Nie stosować kaskadowego usuwania konta obejmującego cudzą historię wymian. Zamknięcie konta blokuje nowe działania; anonimizacja i usunięcie danych po ustalonym okresie retencji, z zachowaniem wymaganych dowodów operacyjnych.

## 5. User Flow: znalezienie książki → chat → etykiety

1. **Odkrycie.** Anna otwiera stronę, wybiera thriller lub wpisuje tytuł/autora. Widzi dostępne egzemplarze, stan książki i wiarygodność właściciela. Może zapisać ofertę na później.
2. **Szczegóły.** Anna otwiera ofertę Bartka: zdjęcia, opis wad, autor, wydanie i profil. Wybiera „Porozmawiaj o wymianie”. Jeżeli nie jest zalogowana, przechodzi logowanie i wraca do oferty.
3. **Rozmowa.** Powstaje lub otwiera się istniejący chat przy tej ofercie. Uczestnicy ustalają szczegóły. Wiadomość nie rezerwuje książki.
4. **Propozycja.** Anna wybiera jedną ze swoich dostępnych ofert i wysyła formalną propozycję. Jeśli nie ma oferty, kreator prowadzi ją przez publikację i pozwala wrócić do rozmowy. Karta pokazuje oba egzemplarze i warunki wysyłki.
5. **Akceptacja.** Bartek akceptuje konkretną wersję propozycji. Backend atomowo rezerwuje oba egzemplarze. Przy konflikcie pokazuje „Książka została już zarezerwowana”; nie tworzy częściowej wymiany. Nowa propozycja zastępująca poprzednią wymaga ponownej akceptacji.
6. **Dane wysyłkowe.** Każdy uzupełnia własne dane nadawcze, punkt/dane odbioru oraz gabaryt nadawanej paczki. Druga strona nie wpisuje za odbiorcę jego adresu. Formularz waliduje pola i dostępność wybranego punktu. Dane nie są pobierane z treści rozmowy.
7. **Podsumowanie.** Każdy zatwierdza dane i warunki. Widoczne: nadawana książka, odbiorca, gabaryt, przewoźnik, koszt, kto płaci oraz zasady anulowania. W pilotażu komunikat: „Wysyłkę finansuje BookFlow”. Budżet platformy musi pokrywać obie paczki; brak budżetu blokuje zakup i daje czytelny komunikat.
8. **Zlecenie dwóch przesyłek.** Dopiero po obu zatwierdzeniach API zapisuje zadania. Worker tworzy i kupuje przesyłkę A→B oraz B→A według procesu operatora. Operacje zewnętrzne nie są jedną transakcją; system zapisuje wynik każdego kierunku osobno.
9. **Oczekiwanie na potwierdzenie.** UI pokazuje „Przygotowujemy etykiety”. Backend odbiera zweryfikowane zdarzenie operatora lub sprawdza status API. W ShipX możliwość pobrania etykiety zależy od opłacenia i odpowiedniego statusu przesyłki, a nie od samego utworzenia jej rekordu [S4].
10. **Etykiety gotowe.** Po gotowości obu kierunków Anna widzi „Pobierz swoją etykietę PDF”, a Bartek własną. Pobranie wymaga sesji i autoryzacji; adres pliku wygasa, proponowane 5 minut. Instrukcja pokazuje termin nadania i numer przesyłki. Jedna strona nigdy nie dostaje etykiety drugiej paczki jako własnej.
11. **Domknięcie.** Każdy nadaje książkę. Status dostarczenia operatora jest informacyjny; każdy odbiorca osobno potwierdza otrzymanie uzgodnionej książki. Dopiero oba potwierdzenia kończą wymianę, oznaczają oferty jako wymienione i odblokowują opinie.

### Stany i sytuacje brzegowe

Wymiana: `proposed → accepted → shipping_preparation → ready_to_ship → in_transit → awaiting_receipts → completed`. Propozycja może przejść do `rejected` lub `expired`. Przed nadaniem dopuszczalne `cancel_requested → cancelled`, po uzgodnieniu skutków zakupu etykiet. `attention_required` zatrzymuje automatyzację w razie problemu, zachowując wcześniejszy etap w historii.

Przesyłka: `draft → queued → creating → purchased → label_ready → in_transit → delivered`; dodatkowo `retry_pending`, `failed`, `cancel_requested`, `cancelled`. Surowy status przewoźnika jest przechowywany oddzielnie i mapowany na stan wewnętrzny. Stan całej wymiany wylicza się z obu kierunków; jedna dostarczona paczka nie oznacza sukcesu.

| Sytuacja | Zachowanie |
|---|---|
| Brak akceptacji | Proponowane wygaśnięcie propozycji po 72 h; przed akceptacją nie blokuje egzemplarzy. |
| Brak danych po akceptacji | Proponowane 48 h na uzupełnienie; wygaśnięcie i zwolnienie rezerwacji tylko jeśli nie rozpoczęto operacji przewozowych. |
| Dwuklik / retry | Klucz idempotencji i unikalność w bazie zwracają wcześniejszy wynik. |
| Timeout po zakupie | Najpierw uzgodnienie statusu z operatorem po zapisanym identyfikatorze/referencji. Nie ponawiać w ciemno zakupu; niepewny wynik kierować do obsługi. |
| Gotowa tylko jedna etykieta | Wstrzymanie udostępnienia etykiet, widoczny problem i ponowienie drugiego kierunku. Brak możliwości atomowego wycofania zakupu; obsługa rozstrzyga anulowanie i koszty. |
| Zmiana danych | Przed zakupem aktualizacja i ponowne potwierdzenie odpowiednich danych; po zakupie sprawdzenie możliwości korekty/anulowania u operatora, bez cichego tworzenia nowej paczki. |
| Anulowanie | Przed rozpoczęciem operacji: zwolnienie obu ofert. Po zakupie: stan oczekiwania na rozstrzygnięcie, bez zakładania automatycznego zwrotu. Po nadaniu brak zwykłego anulowania. |
| Tylko jedna osoba wysłała / uszkodzenie / brak odbioru | Wymiana nie kończy się automatycznie; kontakt z obsługą i ręczne rozstrzygnięcie. Zasady odpowiedzialności do uzgodnienia przed wdrożeniem. |
| Duplikat lub spóźniony webhook | Deduplikacja, sprawdzenie dopuszczalnego przejścia, brak cofania stanu przez starszy event; okresowe uzgodnienie z API. |
| Wycofanie oferty | Dostępna oferta może być wycofana; rezerwowanej nie wolno usuwać poza procedurą anulowania. |

Rezerwacji po rozpoczęciu zakupu przesyłek nie zwalnia sam upływ czasu. Musi istnieć pewność, że żadna paczka nie zostanie nadana lub aktywna sprawa została rozstrzygnięta.

## 6. Kontrakty API i bezpieczeństwo

Przykładowe endpointy, wszystkie wersjonowane pod `/api/v1`:

| Operacja | Kontrakt |
|---|---|
| Wyszukiwanie / rekomendacje | `GET /listings?title=&author=&category=&cursor=`, `GET /recommendations` |
| Oferta | `POST /listings`, `PATCH /listings/{id}`, `POST /listings/{id}/publish`, `POST /listings/{id}/withdraw` |
| Ulubione | `PUT /favorites/{listingId}`, `DELETE /favorites/{listingId}`, `GET /favorites` |
| Rozmowa | `POST /conversations`, `GET /conversations/{id}/messages?cursor=`, `POST /conversations/{id}/messages` |
| Wymiana | `POST /exchanges`, `POST /exchanges/{id}/accept`, `/reject`, `/cancel-request`, `/confirm-receipt` |
| Wysyłka | `PUT /exchanges/{id}/shipping-details`, `POST /exchanges/{id}/shipping-confirmation`, `GET /shipments/{id}/label` |
| Opinia | `POST /exchanges/{id}/reviews` |
| Operator | `POST /webhooks/shipping/{provider}`; mechanizm autentyczności zgodny z rzeczywistą dokumentacją wybranego operatora |

Serwer wyprowadza tożsamość z sesji, nie z `user_id` klienta. Weryfikuje udział w zasobie i aktualną wersję. `409` oznacza konflikt dostępności/wersji, `422` błąd danych, `429` limit; zadanie etykiety odpowiada `202` z identyfikatorem operacji. Operacje tworzące skutki zewnętrzne wymagają klucza idempotencji z hashem żądania; ponowne użycie klucza dla innych danych jest odrzucane.

Sesje przez wspierany mechanizm SSR Auth, bez własnych tokenów logowania. HTTPS, bezpieczne cookies zgodne z integracją, ochrona żądań mutujących przed CSRF i sprawdzenie origin. Limitowanie prób logowania i wiadomości; proponowany początkowy limit chatu 30 wiadomości/minutę/użytkownika, do strojenia.

Treść chatu renderowana jako tekst, bez wykonywalnego HTML. Zdjęcia: do 5 plików po 10 MB, wyłącznie wspierane formaty rastrowe, sprawdzenie faktycznego typu, ponowne kodowanie i usuwanie EXIF. Polityki storage powiązane z właścicielem oferty. Prywatne odpowiedzi i etykiety nie mogą trafić do współdzielonego cache.

Dane adresowe odseparowane, szyfrowane i dostępne tylko usługom realizującym wysyłkę; uczestnik edytuje własne dane. Odbiorca akceptuje konieczne ujawnienie danych nadawcy i przewoźnikowi — etykieta może zawierać informacje osobowe. Logi i monitoring maskują e-mail, telefon, adres i tekst rozmów.

Przed uruchomieniem potrzebne są uzgodnione zasady prywatności, retencji, usuwania kont oraz odpowiedzialności za przesyłki. Dokument nie przesądza podstaw prawnych ani ustawowych terminów przechowywania. Minimalne operacyjne wsparcie: kontakt do obsługi, ograniczony dostęp administratora do zawieszania kont i ukrywania treści z audytem; bez rozbudowanego panelu moderacji w MVP. Obsługa nie czyta prywatnych rozmów rutynowo.

## 7. Wymagania jakościowe, testy i wdrożenie

Założenie do testów: 10 tys. kont, 50 tys. ofert, 100 jednocześnie aktywnych użytkowników. Cele, nie gwarancje: p95 wyszukiwania poniżej 700 ms po stronie API, p95 dostarczenia zapisanej wiadomości do aktywnego odbiorcy poniżej 2 s w normalnej sieci. Etykieta asynchroniczna: komunikat przyjęcia zlecenia poniżej 2 s; czas operatora mierzony osobno, bez gwarancji natychmiastowego PDF.

Cel dostępności aplikacji: 99,5% miesięcznie, osobno raportowana zależność od przewoźnika. Kopie bazy i plików z procedurą odtworzenia; proponowane RPO ≤24 h, RTO ≤8 h. Dobór planu usług i próbne odtworzenie mają potwierdzić osiągalność tych celów.

Testy wymagane przed pilotażem:

- Rejestracja, reset i granice dostępu do API, RLS, realtime, zdjęć i etykiet; próby dostępu użytkownika trzeciego.
- Wyszukiwanie po polskich znakach, wielu autorach, wspólnych tytułach i wydaniach; stabilna paginacja i brak niedostępnych ofert.
- Rezerwacja tego samego egzemplarza równolegle przez dwie osoby: dokładnie jedna akceptacja skuteczna.
- Chat przy utracie połączenia i powtórnym wysłaniu; trwała historia bez duplikatów.
- Podwójny zakup, timeout, częściowy sukces, brak środków, niedostępny punkt, anulowanie, duplikaty i nieuporządkowane zdarzenia operatora.
- Pełny przepływ dwóch kont: oferta → chat → akceptacja → dwa kierunki przesyłek → potwierdzenia odbioru → dwie dozwolone opinie; trzecia opinia odrzucona.
- Testy mobilne, klawiatury, kontrastu, wydajności na docelowej próbce oraz odtworzenia kopii.

Środowiska: lokalne, staging z sandboxem przewoźnika i oddzielna produkcja. Migracje wersjonowane; wdrożenia z możliwością wycofania aplikacji i kompatybilnymi zmianami bazy. Flaga wstrzymująca nowe zakupy etykiet nie blokuje dostępu do już zakupionych. Alerty: kolejka bez postępu, nieuzgodniony zakup, skok błędów i zbliżanie się do limitu budżetu.

Proponowana realizacja dla dwóch doświadczonych programistów ze wsparciem projektanta i QA: 6–9 tygodni po decyzjach produktowych i uzyskaniu dostępu przewozowego; szacunek wstępny, nie zobowiązanie.

1. Uzgodnienia, prototyp ekranów i próba API przewoźnika: 1 tydzień.
2. Konta, oferty, zdjęcia, wyszukiwarka i ulubione: 2–3 tygodnie.
3. Chat, rekomendacje i transakcyjna wymiana: 1–2 tygodnie.
4. Etykiety, potwierdzenia i opinie: 1–2 tygodnie.
5. Testy przekrojowe i ograniczony pilotaż: 1 tydzień.

Warunek rozpoczęcia programowania funkcji przewozowych: potwierdzony operator, uprawnienia konta, płatnik, budżet, anulowania i obsługa jednostronnej wysyłki. Warunek odbioru MVP: F01–F09 spełnione, krytyczne testy pozytywne, procedury wsparcia i odtworzenia sprawdzone, właściciel produktu akceptuje pilotaż.

## 8. Pytania przed rozpoczęciem programowania

### Decyzje blokujące model i zakres

1. Czy akceptujesz wymianę jednej książki za jedną, czy ma być możliwe oddanie bez wzajemności, pakiety lub dopłaty?
2. Czy startujemy wyłącznie w Polsce, po polsku? Kto jest pierwszą grupą odbiorców i w jakim obszarze pozyskujemy oferty?
3. Czy wybieramy InPost, innego przewoźnika czy brokera? Czy masz konto firmowe/API i warunki pozwalające obsługiwać przesyłki użytkowników?
4. Kto ponosi koszt obu kierunków? Czy zatwierdzasz finansowany przez BookFlow pilotaż? Jaki jest limit globalny i limit na użytkownika? Jeśli użytkownicy płacą w aplikacji, konieczna będzie aktualizacja zakresu o płatności.
5. Czy dostępna ma być tylko wysyłka do punktów, również kurier na adres, czy także odbiór osobisty? Ten ostatni wymaga innej ścieżki zakończenia.
6. Co robimy, gdy tylko jedna osoba nada książkę, egzemplarz jest uszkodzony lub niezgodny z opisem? Kto obsługuje zgłoszenia i kto pokrywa straty oraz zwroty?
7. Czy sukces wymaga obu ręcznych potwierdzeń odbioru? Jak rozstrzygamy brak potwierdzenia mimo statusu dostarczenia?
8. Czy akceptujesz proponowane terminy 72 h na propozycję i 48 h na dane? Ile czasu dajemy na nadanie i kiedy interweniuje obsługa?

### Decyzje UX i danych

9. Czy wystarczy e-mail i hasło? Czy wymagane są inne metody logowania? Czy serwis ma być tylko dla pełnoletnich?
10. Jakie kategorie i stany egzemplarza obowiązują? Czy zdjęcie własnej książki oraz opis wad mają być obowiązkowe? Czy podręczniki wymagają roku i wydania?
11. Czy profil pokazuje miejscowość? Jakie informacje poza nazwą, ocenami i ofertami mają być publiczne?
12. Czy można edytować opinię? Propozycja MVP: brak edycji użytkownika, korekta naruszeń przez obsługę z audytem. Czy opinie publikujemy od razu?
13. Czy wybór zainteresowań i rekomendacje oparte na zapisanych ofertach są akceptowane? Czy użytkownik może wybrać widok wyłącznie najnowszych?
14. Jak długo przechowujemy wiadomości, etykiety, dane wysyłkowe i historię wymian? Kto zatwierdza dokumenty prywatności i zasady odpowiedzialności?

### Decyzje realizacyjne

15. Jaki jest budżet budowy i miesięcznego utrzymania, termin pilotażu oraz dostępność zespołu?
16. Czy prognozowana skala i cele niezawodności z rozdziału 7 są właściwe? Jakie ograniczenia dostawców lub lokalizacji danych obowiązują?
17. Kto prowadzi wsparcie, moderację i obsługę błędów przewozowych, w jakich godzinach i z jakim czasem odpowiedzi?
18. Czy pilotaż pozostaje bez opłat platformowych, a decyzję o monetyzacji podejmujemy po sprawdzeniu liczby i kosztu zakończonych wymian?

## 9. Źródła techniczne

Dokumentacja sprawdzona 26.10.2026. Wybór architektury i reguły biznesowe są rekomendacjami projektowymi; dokumentacje potwierdzają możliwości poszczególnych narzędzi, nie gotowość konta BookFlow do ich użycia.

- [S1: Next.js — App Router](https://nextjs.org/docs/app): podstawa proponowanej organizacji frontendu i renderowania.
- [S2: Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): kontrola dostępu do rekordów; RLS należy łączyć z odpowiednimi uprawnieniami.
- [S3: Supabase — Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization): zasady autoryzacji; dla Postgres Changes dostęp do zmian zależy od polityk odczytu rekordów.
- [S4: InPost ShipX — FAQ](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/53706753): warunki dostępu do etykiety oraz ograniczenia zmian i anulowania przesyłki. Szczegółowy kontrakt integracji wymaga sprawdzenia dla wybranej usługi i konta.
- [S5: PostgreSQL — pg_trgm](https://www.postgresql.org/docs/18/pgtrgm.html): podobieństwo tekstu i indeksowanie dopasowań częściowych.

## 10. Dodatkowe funkcje — wyłącznie do ewentualnego zatwierdzenia

Poniższe propozycje nie należą do MVP i nie są uwzględnione w powyższej architekturze ani strukturze bazy danych.

1. **Lista poszukiwanych książek i powiadomienia o dostępności** — pomaga wrócić, gdy pojawi się konkretny tytuł; różni się od zapisywania istniejących ogłoszeń.
2. **Grywalizacja: odznaki za zakończone wymiany** — nagradza aktywność bez zmieniania książek w walutę; reguły wymagają ochrony przed sztucznymi wymianami.
3. **Weryfikacja stanu egzemplarza** — standard zdjęć, lista kontrolna i proces weryfikacji wykraczający poza deklarację właściciela.
4. **Skanowanie ISBN i uzupełnianie metadanych** — skraca dodawanie oferty; wymaga źródła danych i uzgodnienia warunków wykorzystania okładek.
5. **Automatyczne dopasowanie wzajemnych zainteresowań** — wskazuje osoby, których książki interesują obie strony, aby skrócić szukanie partnera do wymiany.
