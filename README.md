# BookFlow — lokalny mock aplikacji

Interaktywny szkielet oparty na `BookFlow-specyfikacja-MVP.md`. Biało-miętowy interfejs, responsywny katalog i autorskie okładki demonstracyjne. Bez dostaw, kurierów, płatności i wdrożenia.

## Uruchomienie

Wymagany Node.js 20 lub nowszy. Nie trzeba instalować pakietów.

```powershell
cd E:\BookFlow
npm run dev
```

Otwórz http://127.0.0.1:4173. Zatrzymanie serwera: Ctrl+C. Serwer nasłuchuje tylko lokalnie.

## Co można sprawdzić

- Odkrywanie książek, filtrowanie kategorii, wyszukiwanie tytułu/autora bez polskich znaków, sortowanie i proste rekomendacje na podstawie zapisanych kategorii.
- Szczegóły książki, profile czytelników i przykładowe opinie.
- Logowanie i rejestracja **symulowane**: dowolne imię i poprawnie sformatowany e-mail. Brak haseł, prawdziwego uwierzytelniania i wysyłki e-maili. E-mail nie jest utrwalany.
- Zapisywanie ulubionych, dodawanie własnego egzemplarza z generowaną okładką i wycofanie oferty.
- Lokalne rozmowy, wysyłanie wiadomości i propozycja wymiany własnej książki.
- Przycisk „Symuluj udaną wymianę” odblokowuje pojedynczą opinię widoczną na profilu partnera.

Dane utrwalane są pod kluczem `bookflow-v1` w localStorage. Konto jest jedną wspólną lokalną personą demo, nie systemem wielu użytkowników. Wylogowanie nie usuwa danych; zmiana imienia zmienia nazwę tej samej persony. Wszystkie wiadomości są lokalne — nie docierają do prawdziwych osób. Oceny początkowe i liczby wymian są danymi przykładowymi; nowe opinie nie przeliczają statystyk demonstracyjnych. Zresetuj demo przez usunięcie klucza localStorage w narzędziach przeglądarki.

## Struktura

- `public/index.html` — powłoka i dialog.
- `public/app.js` — widoki, formularze, zdarzenia i lokalny stan.
- `public/data.js` — przykładowe dane i czyste funkcje katalogu.
- `public/styles.css` — system wizualny i responsywność.
- `server.mjs` — lokalny serwer statyczny bez zależności.
- `tests/catalog.test.mjs` — testy wyszukiwania, filtrów i rekomendacji.

```powershell
npm run check
npm test
```

Wariant mock świadomie używa modułów JavaScript i CSS zamiast Next.js/Supabase z docelowej specyfikacji: nie wymaga backendu, konfiguracji usług ani instalacji zależności. Google Fonts jest opcjonalnym zasobem sieciowym; bez internetu działają czcionki zastępcze i wszystkie funkcje. Książki nie używają zewnętrznych zdjęć ani prawdziwych skanów okładek.

## Granice prototypu

Brak rzeczywistej autoryzacji, wieloużytkownikowości, synchronizacji, uploadu zdjęć, backendowej walidacji, rezerwacji transakcyjnych i integracji. Dane wejściowe są escapowane w HTML, ale localStorage nie jest bazą ani granicą bezpieczeństwa. Nie używaj prawdziwych danych osobowych. Ewentualna realizacja produkcyjna wymaga oddzielnej implementacji według zatwierdzonego zakresu.
