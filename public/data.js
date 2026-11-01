export const categories = ['Wszystkie', 'Literatura piękna', 'Thriller', 'Fantastyka', 'Rozwój osobisty', 'Romans', 'Podręczniki'];
export const conditions = ['Jak nowa', 'Bardzo dobry', 'Dobry', 'Widoczne ślady używania'];
export const coverThemes = ['olive', 'orange', 'sand', 'cream', 'red', 'pink', 'blue'];
export const coverArts = ['people', 'sun', 'planet', 'dots', 'window', 'flower'];
export const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase().trim();
export function selectBooks(books, { query = '', category = 'Wszystkie', view = 'discover', favorites = [], sort = 'recommended', userId = null } = {}) {
  const q = normalize(query);
  const saved = books.filter(b => favorites.includes(b.id));
  const score = b => saved.filter(s => s.category === b.category).length * 3 + saved.filter(s => s.author === b.author).length * 2;
  const newest = (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id);
  return books.filter(b => (view === 'shelf' ? b.owner === userId : view === 'saved' ? favorites.includes(b.id) : true) && (category === 'Wszystkie' || b.category === category) && q.split(/\s+/).every(word => normalize(b.title + ' ' + b.author).includes(word)))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'pl') || newest(a, b) : sort === 'newest' ? newest(a, b) : score(b) - score(a) || newest(a, b));
}
