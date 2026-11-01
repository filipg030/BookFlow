import { categories, conditions, coverThemes, coverArts, selectBooks } from './data.js';
import { api, booksApi } from './api.js';

const $ = s => document.querySelector(s);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const icons = { moon:'<path d="M20.9 13.2A9 9 0 0 1 10.8 3.1 9 9 0 1 0 20.9 13.2Z"/>', book:'<path d="M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3zM12 6v15"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>', chat:'<path d="M21 11a9 9 0 0 1-9 9H4l-3 2 1-7A9 9 0 1 1 21 11Z"/><path d="M7 10h9M7 14h5"/>', plus:'<path d="M12 4v16M4 12h16"/>', arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>', leaf:'<path d="M20 3C9 2 2 7 5 15s16 4 15-12ZM4 21 15 9"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>', grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>', swap:'<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/>', check:'<path d="m5 12 4 4L20 5"/>', logout:'<path d="M9 4H3v16h6m5-14 6 6-6 6M8 12h12"/>' };
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;

const freshState = () => ({ books: [], favorites: [], threads: [], user: null, reviews: [] });
let state = freshState();
let booksReady = false, booksError = '', bookRequest = 0;
function loadUser(user) {
  let local;
  if (user) { try { local = JSON.parse(localStorage.getItem('bookflow-local:v2:' + user.id)); } catch {} }
  const books = state.books;
  state = freshState();
  state.books = books;
  if (local) for (const key of ['favorites', 'threads', 'reviews']) {
    if (Array.isArray(local[key])) state[key] = local[key];
  }
  state.user = user;
  activeThread = state.threads[0]?.id;
}

async function refreshUser() { const result = await api('me'); if (state.user?.id !== result.user?.id) loadUser(result.user); else state.user=result.user; }
let view = ['discover','saved','shelf','messages','profile'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'discover';
let query = '', category = 'Wszystkie', sort = 'recommended', activeThread = state.threads[0]?.id, toastTimer, modalReturn;
function person(id) {
  const own = id === 'me' || id === state.user?.id;
  const name = own ? state.user?.name || 'Twoja przestrzeń' : state.books.find(b => b.owner === id)?.ownerName || 'Czytelnik';
  return { name, initials: name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(), color: '#d9e9df' };
}
function persist() {
  try {
    if (state.user) localStorage.setItem('bookflow-local:v2:' + state.user.id, JSON.stringify({ favorites: state.favorites, threads: state.threads, reviews: state.reviews }));
  } catch { toast('Brak miejsca w przeglądarce. Lokalne zmiany pozostaną tylko w tej sesji.'); }
}
async function refreshBooks() {
  const request = ++bookRequest;
  try {
    const result = await booksApi();
    if (!Array.isArray(result.books)) throw new Error('Niepoprawna odpowiedź katalogu. Uruchom ponownie serwer BookFlow.');
    if (request !== bookRequest) return;
    state.books = result.books;
    booksError = '';
  } catch (error) {
    if (request !== bookRequest) return;
    state.books = [];
    booksError = error.message || 'Nie można pobrać książek. Sprawdź połączenie z serwerem.';
  }
  booksReady = true;
}
function upsertBook(book) {
  ++bookRequest; // An older catalog response must not overwrite a completed mutation.
  state.books = [book, ...state.books.filter(b => b.id !== book.id)];
  booksReady = true;
  booksError = '';
}
function removeBook(id) {
  ++bookRequest;
  state.books = state.books.filter(b => b.id !== id);
  state.favorites = state.favorites.filter(value => value !== id);
  persist();
}
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
function avatar(id, cls = '') { const p = person(id); return `<span class="avatar ${cls}" style="--avatar:${p.color}">${escape(p.initials)}</span>`; }
function cover(b, cls = '') { return `<div class="cover ${escape(b.theme || 'olive')} ${cls}" role="img" aria-label="Okładka zastępcza: ${escape(b.title)}"><span class="cover-author">${escape(b.kicker || b.author)}</span><strong>${escape(b.subtitle || b.title).replace(/\n/g,'<br>')}</strong><div class="cover-art ${escape(b.art || 'sun')}"><i></i><i></i><i></i><i></i></div><span class="cover-note">${escape(b.note || 'Kolejna dobra historia.')}</span><span class="cover-publisher">BOOKFLOW · PODAJ DALEJ</span></div>`; }
function navButton(id, label, symbol, count) { return `<button class="nav-item ${view === id ? 'active' : ''}" data-view="${id}" aria-label="${label}" ${view === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${count ? `<small>${count}</small>` : ''}</button>`; }
function themeToggle() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return `<button type="button" class="theme-toggle" data-action="toggle-theme" role="switch" aria-checked="${dark}" aria-label="Tryb ciemny" title="Włącz lub wyłącz tryb ciemny">${icon('moon')}<span class="theme-label">Tryb ciemny</span><span class="theme-track" aria-hidden="true"></span></button>`;
}
function toggleTheme(button) {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  button.setAttribute('aria-checked', String(dark));
  try { localStorage.setItem('bookflow-theme', dark ? 'dark' : 'light'); }
  catch { toast('Motyw zmieniony. Przeglądarka nie pozwala zapamiętać wyboru.'); }
}
function render() {
  $('#app').innerHTML = `<aside class="sidebar"><button class="brand" data-view="discover" aria-label="BookFlow — strona główna"><span class="brand-mark">${icon('book')}</span>bookflow<span class="brand-dot">.</span></button><p class="nav-label">TWOJA CZYTELNICZA PRZESTRZEŃ</p><nav aria-label="Główna nawigacja">${navButton('discover','Odkrywaj','grid')}${navButton('saved','Zapisane','heart',state.favorites.length)}${navButton('messages','Wiadomości','chat',state.threads.length)}${navButton('shelf','Moja półka','book')}</nav><div class="sidebar-note">${icon('leaf')}<h3>Dobra historia<br>nie kończy się na Tobie.</h3><p>Podaj ją dalej.<br>Ktoś właśnie na nią czeka.</p><button data-action="add">Dodaj swoją książkę ${icon('arrow')}</button></div><div class="sidebar-bottom"><span class="sidebar-status"><span class="demo-indicator"></span> Książki społeczności</span><button class="profile-link" data-view="profile">${avatar('me')}<span><b>${escape(state.user ? person('me').name : 'Twoja przestrzeń')}</b><small>${state.user ? 'Zobacz swój profil' : 'Poznaj BookFlow'}</small></span>${icon('arrow')}</button>${themeToggle()}</div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">Twoja następna historia <span>zaczyna się tutaj</span></div><div class="header-actions"><button class="primary compact" data-action="add">${icon('plus')} Dodaj książkę</button>${state.user ? `<button class="avatar-button" data-view="profile" aria-label="Mój profil">${avatar('me')}</button>` : '<button class="text-button" data-action="login">Zaloguj się</button>'}</div></header><main id="main" tabindex="-1">${content()}</main><footer><span class="footer-brand">bookflow.</span><span>Mniej książek na półce. Więcej historii w obiegu.</span><small>BookFlow · 2026</small></footer></div>`;
}
function content() {
  if (view !== 'discover' && !state.user) return '<div class="empty"><h2>Twoja czytelnicza przestrzeń</h2><p>Zaloguj się, aby otworzyć tę sekcję.</p><button class="primary" data-action="login">Zaloguj się</button></div>';
  if (view === 'messages') return messagesView();
  if (view === 'profile') return profileView('me');
  const discover = view === 'discover';
  return `${discover ? `<section class="hero"><div class="hero-copy"><span class="eyebrow"><span></span> CZYTAJ. WYMIENIAJ. ODKRYWAJ.</span><h1>Dobre książki.<br><em>Nowe historie.</em></h1><p>Twoja przeczytana książka to czyjś nowy początek. <br>Wymieniaj się i znajdź coś dla siebie.</p><button class="dark-button" data-action="explore">Znajdź następną książkę ${icon('arrow')}</button><div class="hero-community">${icon('leaf')}<span>Mała wymiana.<br><b>Wielka przyjemność czytania.</b></span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><span class="art-spark">✳</span>${state.books[1] ? `<div class="hero-book back">${cover(state.books[1])}</div>` : ''}${state.books[0] ? `<div class="hero-book front">${cover(state.books[0])}</div>` : `<div class="hero-empty-art">${icon('book')}<span>Każda książka<br>to nowy początek.</span></div>`}<div class="floating-tag">${icon('swap')} Historie są po to, by krążyć</div><span class="art-caption">ODDAJ PRZECZYTANE. ZNAJDŹ NIEZNANE.</span></div></section><section class="benefits"><span>${icon('swap')} Książka za książkę</span><span>${icon('heart')} Od czytelników, dla czytelników</span><span>${icon('leaf')} Więcej czytania, mniej kupowania</span></section>` : `<div class="page-intro"><span class="eyebrow">TWOJA PRZESTRZEŃ</span><h1>${view === 'saved' ? 'Historie na później.' : 'Twoja mała biblioteka.'}</h1><p>${view === 'saved' ? 'Wszystkie książki, do których chcesz wrócić.' : 'Daj przeczytanym książkom szansę na kolejny rozdział.'}</p>${view === 'shelf' ? '<button class="primary" data-action="add">+ Dodaj książkę</button>' : ''}</div>`}<section class="catalog" id="catalog"><div class="section-heading"><div><span class="eyebrow">${discover ? 'DOBRANE DO TWOJEJ CIEKAWOŚCI' : 'DOBRE HISTORIE BLISKO CIEBIE'}</span><h2>${discover ? 'Odkryj swoją następną książkę' : view === 'saved' ? 'Zapisane książki' : 'Książki na Twojej półce'}</h2></div><span class="subtle">${discover ? 'Każda książka to nowa możliwość.' : ''}</span></div><div class="search-row"><label class="search-box">${icon('search')}<input id="search" type="search" value="${escape(query)}" placeholder="Jaki tytuł lub autor chodzi Ci po głowie?" aria-label="Szukaj po tytule lub autorze"><kbd>/</kbd></label><label class="sort-box">Sortuj: <select id="sort" aria-label="Sortowanie"><option value="recommended" ${sort === 'recommended' ? 'selected' : ''}>Dla Ciebie</option><option value="newest" ${sort === 'newest' ? 'selected' : ''}>Najnowsze</option><option value="title" ${sort === 'title' ? 'selected' : ''}>Tytuł A–Z</option></select></label></div><div class="categories" aria-label="Kategorie">${categories.map((c,i)=>`<button data-category="${c}" aria-pressed="${category === c}" class="chip ${category === c ? 'selected' : ''}">${i === 0 ? icon('grid') : ''}${c}</button>`).join('')}</div><div id="results">${results()}</div></section>${discover ? `<section class="bottom-banner"><div class="banner-icon">${icon('book')}</div><div><h2>Na Twojej półce czeka czyjaś następna historia.</h2><p>Zrób trochę miejsca. Dodaj książkę i puść ją w obieg.</p></div><button class="dark-button" data-action="add">Dodaj pierwszą książkę ${icon('plus')}</button></section>` : ''}`;
}
function results() {
  if (!booksReady) return '<div class="empty" role="status"><h3>Ładowanie książek…</h3></div>';
  if (booksError) return `<div class="empty" role="alert"><h3>Nie udało się pobrać książek</h3><p>${escape(booksError)}</p><button class="primary" data-action="reload-books">Spróbuj ponownie</button></div>`;
  const books = selectBooks(state.books, { query, category, view, favorites: state.favorites, sort, userId: state.user?.id });
  const filtered = query || category !== 'Wszystkie';
  const canAdd = !filtered && view !== 'saved';
  return `<div class="results-meta"><span>Liczba książek: ${books.length}</span><span class="availability"><i></i> Gotowe na nowy rozdział</span></div>${books.length ? `<div class="book-grid">${books.map(card).join('')}</div>` : `<div class="empty">${icon('book')}<h3>${filtered ? 'Nie znaleziono książek' : view === 'saved' ? 'Zapisz swoją pierwszą historię' : 'Jeszcze nie ma tu książek'}</h3><p>${filtered ? 'Spróbuj innego tytułu, autora lub kategorii.' : canAdd ? 'Dodaj książkę, którą chcesz podać dalej. Pojawi się tutaj i u innych czytelników.' : 'Kliknij serduszko przy książce, która Cię zainteresuje.'}</p><button class="primary" data-action="${canAdd ? 'add' : 'reset-filters'}">${canAdd ? 'Dodaj książkę' : 'Przeglądaj wszystkie'}</button></div>`}`;
}
function card(b) {
  const saved = state.favorites.includes(b.id), own = b.owner === state.user?.id;
  return `<article class="book-card"><div class="book-stage ${escape(b.theme)}-stage"><button class="cover-button" data-book="${escape(b.id)}" aria-label="Zobacz: ${escape(b.title)}">${cover(b)}</button><button class="save-button ${saved ? 'saved' : ''}" data-save="${escape(b.id)}" aria-label="${saved ? 'Usuń z zapisanych' : 'Zapisz'}: ${escape(b.title)}" aria-pressed="${saved}">${icon('heart')}</button><span class="condition">${b.condition === 'Jak nowa' ? '✧' : '✓'} ${escape(b.condition)}</span></div><div class="card-details"><span class="book-category">${escape(b.category)}</span><h3><button data-book="${escape(b.id)}">${escape(b.title)}</button></h3><p>${escape(b.author)}</p><div class="card-owner"><button data-person="${escape(b.owner)}">${avatar(b.owner)}<span>${escape(b.ownerName)}<small>${own ? 'Twoje ogłoszenie' : 'Wystawiający'}</small></span></button></div>${own ? `<div class="listing-actions"><button class="secondary compact" data-edit="${escape(b.id)}">Edytuj</button><button class="text-button danger" data-delete="${escape(b.id)}">Usuń</button></div>` : ''}</div></article>`;
}
function profileView(id) {
  const own = id === 'me' || id === state.user?.id, p = person(id);
  const books = state.books.filter(b => b.owner === (own ? state.user?.id : id));
  const reviews = state.reviews.filter(r => r.person === id);
  return `<section class="profile-page"><span class="eyebrow">${own ? 'TWOJE KONTO' : 'LUDZIE ZA HISTORIAMI'}</span><div class="profile-head">${avatar(id, 'large')}<div><h1>${escape(p.name)}</h1>${own && state.user ? `<p>${escape(state.user.email)}</p>` : ''}<p>Aktywne ogłoszenia: ${books.length}</p></div></div>${own ? '<div class="profile-actions"><button class="primary" data-view="shelf">Moja półka</button><button class="secondary" data-action="password">Zmień hasło</button><button class="secondary" data-action="logout">Wyloguj się</button></div>' : ''}<h2>Książki na wymianę</h2>${books.length ? `<div class="book-grid">${books.map(card).join('')}</div>` : '<p>Brak aktywnych ogłoszeń.</p>'}${reviews.length ? `<h2>Twoje lokalne opinie</h2><div class="review-list">${reviews.map(r => `<article class="review"><p>${escape(r.rating)}/5 · ${escape(r.text || 'Udana wymiana!')}</p><small>Opinia demonstracyjna, widoczna tylko w tej przeglądarce.</small></article>`).join('')}</div>` : ''}</section>`;
}
function messagesView() { const t = state.threads.find(t=>t.id===activeThread), b = t && state.books.find(b=>b.id===t.bookId); return `<div class="page-intro"><span class="eyebrow">DOBRA WYMIANA ZACZYNA SIĘ OD ROZMOWY</span><h1>Między rozdziałami.</h1><p>Twoje rozmowy z innymi czytelnikami. Wiadomości w tym demo pozostają na tym urządzeniu.</p></div><section class="messenger"><div class="thread-list"><h3>Wiadomości <span>${state.threads.length}</span></h3>${state.threads.map(x=>`<button class="thread ${x.id === activeThread ? 'selected' : ''}" data-thread="${x.id}">${avatar(x.person)}<span><b>${escape(person(x.person).name)}</b><small>${escape(state.books.find(b=>b.id===x.bookId)?.title || 'Ogłoszenie niedostępne')}</small></span></button>`).join('')}</div>${t && b ? `<div class="chat-panel"><div class="chat-header"><button data-person="${t.person}">${avatar(t.person)}<span><b>${escape(person(t.person).name)}</b><small>Rozmowa demonstracyjna</small></span></button></div><div class="chat-book">${icon('book')}<span>Rozmawiacie o <b>${escape(b.title)}</b></span><button data-book="${b.id}">Zobacz ofertę ↗</button></div><div class="messages" aria-live="polite"><span class="date-divider">Przykładowa rozmowa</span>${t.messages.map(m=>`<div class="message ${m.mine ? 'mine' : ''}"><p>${escape(m.text)}</p><small>${escape(m.time)}</small></div>`).join('')}</div><div class="exchange-strip">${t.status === 'completed' ? `${icon('check')} Wymiana zakończona <button data-action="review">${state.reviews.some(r=>r.threadId===t.id) ? 'Opinia wystawiona' : 'Wystaw opinię'}</button>` : `<span>${t.status === 'proposed' ? 'Propozycja wysłana · symulacja' : 'Znalazłeś coś dla siebie?'}</span><button data-action="${t.status === 'proposed' ? 'complete' : 'propose'}">${t.status === 'proposed' ? 'Symuluj udaną wymianę' : 'Zaproponuj wymianę'} ${icon('swap')}</button>`}</div><form id="message-form" class="message-form"><input name="message" maxlength="4000" required placeholder="Napisz wiadomość…" aria-label="Treść wiadomości" autocomplete="off"><button class="primary" aria-label="Wyślij wiadomość">${icon('arrow')}</button></form></div>` : '<div class="empty"><h3>Tu zaczyna się dobra rozmowa</h3><p>Otwórz książkę i napisz do jej właściciela.</p></div>'}</section>`; }
function openModal(html) { modalReturn = document.activeElement; $('#modal').innerHTML = `<button class="modal-close" data-action="close" aria-label="Zamknij">${icon('close')}</button>${html}`; if (!$('#modal').open) $('#modal').showModal(); }
function closeModal() { $('#modal').close(); modalReturn?.isConnected && modalReturn.focus(); }
async function details(id) {
  try {
    const { book } = await booksApi(id);
    upsertBook(book);
    const own = book.owner === state.user?.id;
    openModal(`<div class="detail-layout"><div class="detail-art ${escape(book.theme)}-stage">${cover(book)}</div><div class="detail-content"><span class="eyebrow">${escape(book.category)}</span><h2>${escape(book.title)}</h2><p class="detail-author">${escape(book.author)}</p><span class="condition inline">✓ ${escape(book.condition)}</span><h3>O tym egzemplarzu</h3><p class="listing-description">${escape(book.description)}</p><button class="detail-owner" data-person="${escape(book.owner)}">${avatar(book.owner)}<span><b>${escape(book.ownerName)}</b><small>${own ? 'Twoje ogłoszenie' : 'Wystawiający'}</small></span>${icon('arrow')}</button>${own ? `<button class="primary full" data-edit="${escape(book.id)}">Edytuj ogłoszenie</button><button class="secondary full danger" data-delete="${escape(book.id)}">Usuń ogłoszenie</button>` : `<button class="primary full" data-chat="${escape(book.id)}">${icon('chat')} Porozmawiaj o wymianie</button>`}<button class="secondary full" data-save="${escape(book.id)}">${icon('heart')} ${state.favorites.includes(id) ? 'Usuń z zapisanych' : 'Zapisz na później'}</button><small class="demo-caption">Okładka zastępcza. Rozmowy i wymiany są na razie lokalną demonstracją.</small></div></div>`);
  } catch (error) {
    if (error.status === 404) { removeBook(id); closeModal(); render(); }
    toast(error.message || 'Nie udało się otworzyć ogłoszenia.');
  }
}
async function editBook(id) {
  await requireUser(async () => {
    try {
      const { book } = await booksApi(id);
      if (book.owner !== state.user.id) { toast('Możesz edytować tylko własne ogłoszenia.'); return; }
      upsertBook(book);
      bookForm(book);
    } catch (error) { toast(error.message); }
  });
}
async function deleteBook(id) {
  await requireUser(async () => {
    try {
      const { book } = await booksApi(id);
      if (book.owner !== state.user.id) { toast('Możesz usuwać tylko własne ogłoszenia.'); return; }
      openModal(`<div class="form-modal"><h2>Usunąć ogłoszenie?</h2><p>„${escape(book.title)}” zniknie z katalogu i Twojej półki. Tej operacji nie można cofnąć.</p><form id="delete-form" data-book-id="${escape(book.id)}" data-version="${book.version}"><p class="form-error" role="alert"></p><button class="primary full" type="submit">Usuń ogłoszenie</button><button class="secondary full" type="button" data-action="close">Anuluj</button></form></div>`);
    } catch (error) { toast(error.message); }
  });
}
let pendingAction;
async function requireUser(next) { try { await refreshUser(); if (state.user) await next(); else { pendingAction=next; render(); auth(); } } catch { toast('Nie można połączyć się z serwerem. Spróbuj ponownie.'); } }
function auth(register = false) { openModal(`<div class="form-modal"><span class="brand-mark">${icon('book')}</span><span class="eyebrow">WITAJ W BOOKFLOW</span><h2>${register ? 'Nowy rozdział?' : 'Dobrze Cię widzieć.'}</h2><p>${register ? 'Utwórz konto z własnym adresem e-mail i hasłem.' : 'Zaloguj się do swojej czytelniczej przestrzeni.'}</p><form id="auth-form" data-mode="${register ? 'register' : 'login'}">${register ? '<label>Twoje imię<input name="name" required minlength="2" maxlength="60" autocomplete="name"></label>' : ''}<label>E-mail<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label>Hasło<input name="password" type="password" required ${register ? 'minlength="12"' : ''} maxlength="128" autocomplete="${register ? 'new-password' : 'current-password'}"></label>${register ? '<label>Powtórz hasło<input name="confirmPassword" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><p class="demo-caption">Hasło: 12–128 znaków. Weryfikacja e-maila i odzyskiwanie hasła przez e-mail nie są jeszcze dostępne.</p>' : ''}<p class="form-error" role="alert"></p><button class="primary full" type="submit">${register ? 'Utwórz konto' : 'Zaloguj się'} ${icon('arrow')}</button></form><button class="text-button full" data-action="${register ? 'login' : 'register'}">${register ? 'Masz już konto? Zaloguj się' : 'Pierwszy raz tutaj? Załóż konto'}</button></div>`); }
function passwordForm() { requireUser(()=>openModal('<div class="form-modal"><h2>Zmień hasło</h2><p>Po zmianie pozostałe sesje zostaną wylogowane.</p><form id="password-form"><label>Obecne hasło<input type="password" name="currentPassword" required maxlength="128" autocomplete="current-password"></label><label>Nowe hasło<input type="password" name="newPassword" required minlength="12" maxlength="128" autocomplete="new-password"></label><label>Powtórz nowe hasło<input type="password" name="confirmPassword" required minlength="12" maxlength="128" autocomplete="new-password"></label><p class="form-error" role="alert"></p><button class="primary full">Zmień hasło</button></form></div>')); }
function addForm() { requireUser(() => bookForm()); }
function bookForm(book = {}) {
  const editing = Boolean(book.id);
  const options = (values, current, labels = {}) => values.map(v => `<option value="${escape(v)}" ${v === current ? 'selected' : ''}>${escape(labels[v] || v)}</option>`).join('');
  const themeNames = { olive: 'Oliwkowy', orange: 'Pomarańczowy', sand: 'Piaskowy', cream: 'Kremowy', red: 'Bordowy', pink: 'Różowy', blue: 'Niebieski' };
  const artNames = { people: 'Ludzie', sun: 'Słońce', planet: 'Planeta', dots: 'Kropki', window: 'Okno', flower: 'Kwiat' };
  openModal(`<div class="form-modal wide"><span class="eyebrow">PODAJ DOBRĄ HISTORIĘ DALEJ</span><h2>${editing ? 'Edytuj ogłoszenie' : 'Co masz na półce?'}</h2><p>${editing ? 'Zaktualizuj opis książki i jej stan.' : 'Dodaj egzemplarz gotowy na nowego czytelnika.'}</p><form id="book-form" data-book-id="${escape(book.id || '')}" data-version="${book.version || ''}"><div class="form-grid"><label>Tytuł<input name="title" required maxlength="100" value="${escape(book.title)}" placeholder="np. Zanim wystygnie kawa"></label><label>Autor<input name="author" required maxlength="100" value="${escape(book.author)}" placeholder="np. Toshikazu Kawaguchi"></label><label>Kategoria<select name="category">${options(categories.slice(1), book.category)}</select></label><label>Stan książki<select name="condition">${options(conditions, book.condition)}</select></label></div><label>Opis egzemplarza i ewentualne wady<textarea name="description" required maxlength="1500" rows="4" placeholder="Opowiedz o książce i jej stanie…">${escape(book.description)}</textarea></label><label>Kolor okładki zastępczej<select name="theme">${options(coverThemes, book.theme || 'olive', themeNames)}</select></label><details class="cover-options"><summary>Dostosuj okładkę zastępczą</summary><label>Ilustracja<select name="art">${options(coverArts, book.art || 'sun', artNames)}</select></label><label>Podpis autora na okładce<input name="kicker" maxlength="100" value="${escape(book.kicker)}" placeholder="Domyślnie autor książki"></label><label>Tytuł na okładce<textarea name="subtitle" maxlength="100" rows="2" placeholder="Domyślnie tytuł książki">${escape(book.subtitle)}</textarea></label><label>Dopisek na okładce<input name="note" maxlength="200" value="${escape(book.note)}" placeholder="Kolejna dobra historia."></label></details><p class="form-error" role="alert"></p><button class="primary full" type="submit">${editing ? 'Zapisz zmiany' : 'Dodaj na moją półkę'} ${icon(editing ? 'check' : 'plus')}</button></form></div>`);
}
function navigate(next) { view=next; query=''; category='Wszystkie'; history.replaceState(null,'',`#${next}`); render(); window.scrollTo({top:0,behavior:'smooth'}); }
document.addEventListener('click', async e => {
  const target=e.target.closest('button'); if (!target) return;
  const d=target.dataset;
  if (d.view) { if (d.view !== 'discover') requireUser(()=>{closeModal();navigate(d.view);}); else {closeModal();navigate(d.view);} }
  if (d.category) { category=d.category; const y=window.scrollY; render(); window.scrollTo(0,y); }
  if (d.book) details(d.book);
  if (d.person) openModal(profileView(d.person));
  if (d.save) requireUser(()=>{ const i=state.favorites.indexOf(d.save); i<0 ? state.favorites.push(d.save) : state.favorites.splice(i,1); persist(); const y=window.scrollY; render(); window.scrollTo(0,y); if ($('#modal').open) details(d.save); toast(i<0 ? 'Książka zapisana na później.' : 'Usunięto z zapisanych.'); });
  if (d.chat) requireUser(()=>{ const b=state.books.find(b=>b.id===d.chat); if(!b || b.owner===state.user.id) return; let t=state.threads.find(t=>t.bookId===b.id); if (!t) { t={id:crypto.randomUUID(),bookId:b.id,person:b.owner,messages:[],status:'chat'}; state.threads.unshift(t); persist(); } activeThread=t.id; closeModal(); navigate('messages'); });
  if (d.thread) { activeThread=d.thread; render(); }
  if (d.edit) await editBook(d.edit);
  if (d.delete) await deleteBook(d.delete);
  if (!d.action) return;
  const t=state.threads.find(t=>t.id===activeThread);
  switch(d.action) {
    case 'toggle-theme': toggleTheme(target); break;
    case 'close': closeModal(); break;
    case 'login': auth(); break;
    case 'register': auth(true); break;
    case 'logout': try { await api('logout',{}); loadUser(null); closeModal(); navigate('discover'); toast('Wylogowano.'); } catch { toast('Nie udało się wylogować. Spróbuj ponownie.'); } break;
    case 'password': passwordForm(); break;
    case 'add': addForm(); break;
    case 'reload-books': await refreshBooks(); render(); break;
    case 'explore': $('#catalog').scrollIntoView({behavior:'smooth'}); $('#search').focus({preventScroll:true}); break;
    case 'reset-filters': navigate('discover'); break;
    case 'propose': requireUser(()=>{ const own=state.books.filter(b=>b.owner===state.user?.id); openModal(`<div class="form-modal"><span class="eyebrow">KSIĄŻKA ZA KSIĄŻKĘ</span><h2>Zaproponuj historię.</h2>${own.length ? `<form id="proposal-form"><label>Twoja książka<select name="bookId">${own.map(b=>`<option value="${b.id}">${escape(b.title)}</option>`).join('')}</select></label><p>Propozycja pojawi się w lokalnej rozmowie demonstracyjnej.</p><button class="primary full">Wyślij propozycję ${icon('swap')}</button></form>` : '<p>Najpierw dodaj własną książkę na wymianę.</p><button class="primary" data-action="add">Dodaj książkę</button>'}</div>`); }); break;
    case 'complete': requireUser(()=>{ t.status='completed'; persist(); render(); toast('Zasymulowano udaną wymianę. Możesz wystawić opinię.'); }); break;
    case 'review': requireUser(()=>{ if (state.reviews.some(r=>r.threadId===t.id)) { toast('Opinia dla tej wymiany już istnieje.'); return; } openModal(`<div class="form-modal"><span class="eyebrow">DZIĘKUJEMY ZA WYMIANĘ</span><h2>Jak było?</h2><form id="review-form"><label>Ocena<select name="rating">${[5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)} — ${n}/5</option>`).join('')}</select></label><label>Twoja opinia<textarea name="text" maxlength="1000" rows="4" placeholder="Jak oceniasz kontakt i książkę?"></textarea></label><button class="primary full">Zapisz opinię</button></form></div>`); }); break;
  }
});
document.addEventListener('input', e=>{ if(e.target.id==='search') { query=e.target.value; $('#results').innerHTML=results(); } });
document.addEventListener('change', e=>{ if(e.target.id==='sort') { sort=e.target.value; $('#results').innerHTML=results(); } });
document.addEventListener('submit', async e=>{
  const form=e.target; if(!['auth-form','password-form','book-form','delete-form','message-form','proposal-form','review-form'].includes(form.id)) return; e.preventDefault(); const data=Object.fromEntries(new FormData(form));
  if(form.id==='auth-form' || form.id==='password-form') {
    const changing = form.id==='password-form';
    const registering = form.dataset.mode==='register';
    const button=form.querySelector('[type="submit"]') || form.querySelector('button');
    const error=form.querySelector('.form-error');
    if ((changing || registering) && data.confirmPassword !== (changing ? data.newPassword : data.password)) { error.textContent='Hasła nie są identyczne.'; return; }
    button.disabled=true; error.textContent='';
    try {
      const result=await api(changing ? 'password' : form.dataset.mode, data);
      if (changing) { form.reset(); closeModal(); toast('Hasło zmienione. Pozostałe sesje wylogowane.'); }
      else { loadUser(result.user); const next=pendingAction; pendingAction=null; closeModal(); render(); if(next) await next(); toast(registering ? 'Konto zostało utworzone.' : 'Zalogowano.'); }
    } catch (err) {
      error.textContent=err.message || 'Nie można połączyć się z serwerem.';
      if (err.code === 'BACKEND_UNAVAILABLE') {
        const link=document.createElement('a');
        link.href='http://127.0.0.1:4174/'; link.textContent='Przejdź do aktualnej aplikacji';
        link.style.display='block'; error.append(link);
      }
    }
    finally { button.disabled=false; }
    return;
  }
  if (form.id === 'book-form' || form.id === 'delete-form') {
    const button = form.querySelector('[type="submit"]'), error = form.querySelector('.form-error');
    if (button.disabled) return;
    button.disabled = true; error.textContent = '';
    const id = form.dataset.bookId;
    try {
      if (form.id === 'delete-form') {
        await booksApi(id, 'DELETE', { version: Number(form.dataset.version) });
        removeBook(id); closeModal(); render(); toast('Ogłoszenie zostało usunięte.');
      } else {
        if (id) data.version = Number(form.dataset.version);
        const { book } = await booksApi(id, id ? 'PATCH' : 'POST', data);
        upsertBook(book); closeModal(); navigate('shelf'); toast(id ? 'Zmiany zostały zapisane.' : 'Książka trafiła na Twoją półkę.');
      }
    } catch (err) { error.textContent = err.message || 'Nie udało się zapisać zmian. Spróbuj ponownie.'; }
    finally { button.disabled = false; }
    return;
  }

  if(form.id==='message-form') { const text=data.message.trim(); if(!text) return; requireUser(()=>{ const t=state.threads.find(t=>t.id===activeThread); if(!t || !state.books.some(b=>b.id===t.bookId)) { toast('Ogłoszenie nie jest już dostępne.'); return; } t.messages.push({text,mine:true,time:new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}); persist(); render(); $('.messages').scrollTop=$('.messages').scrollHeight; $('[name="message"]').focus(); }); }
  if(form.id==='proposal-form') { const t=state.threads.find(t=>t.id===activeThread), b=state.books.find(b=>b.id===data.bookId); if(!t || !b || b.owner!==state.user?.id || !state.books.some(x=>x.id===t.bookId)) { toast('Jedna z książek nie jest już dostępna.'); return; } t.status='proposed'; t.messages.push({text:`Proponuję wymianę: „${b.title}” za „${state.books.find(b=>b.id===t.bookId).title}”.`,mine:true,time:'teraz'}); persist(); closeModal(); render(); }
  if(form.id==='review-form') { const t=state.threads.find(t=>t.id===activeThread); if(!t || t.status!=='completed'||state.reviews.some(r=>r.threadId===t.id)) return; state.reviews.push({threadId:t.id,person:t.person,rating:Number(data.rating),text:data.text.trim()}); persist(); closeModal(); render(); toast('Dziękujemy! Opinia jest widoczna na profilu czytelnika.'); }
});
$('#modal').addEventListener('click',e=>{ if(e.target===$('#modal')) {const r=$('#modal').getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) closeModal();} });
$('#modal').addEventListener('close',()=>{ if(!state.user) pendingAction=null; });
document.addEventListener('keydown',e=>{ if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!$('#modal').open) { e.preventDefault(); $('#search')?.focus(); } });
window.addEventListener('hashchange',()=>{ const next=location.hash.slice(1); if(['discover','saved','shelf','messages','profile'].includes(next)) {view=next;render();} });
render();
Promise.all([refreshBooks(), refreshUser().catch(() => toast('Nie udało się sprawdzić sesji. Sprawdź serwer.'))]).then(() => render());
window.addEventListener('focus', async () => {
  const id = state.user?.id;
  try {
    await refreshUser();
    if (id !== state.user?.id) { closeModal(); render(); }
    if ($('#modal').open) return;
    await refreshBooks();
    if (!$('#modal').open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) render();
  } catch {}
});
