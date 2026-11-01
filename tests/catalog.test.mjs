import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, selectBooks } from '../public/data.js';

const books = [
  { id: '1', title: 'Normalni ludzie', author: 'Sally Rooney', category: 'Literatura piękna', owner: 'alice', createdAt: 100 },
  { id: '2', title: 'Diuna', author: 'Frank Herbert', category: 'Fantastyka', owner: 'bob', createdAt: 200 },
  { id: '3', title: 'Mały Książę', author: 'Antoine de Saint-Exupéry', category: 'Literatura piękna', owner: 'bob', createdAt: 300 }
];

test('Wyszukiwanie ignoruje polskie znaki i łączy tytuł z autorem', () => {
  assert.equal(normalize('ŁÓDŹ'), 'lodz');
  assert.deepEqual(selectBooks(books, { query: 'normalni rooney' }).map(b => b.id), ['1']);
  assert.deepEqual(selectBooks(books, { query: 'maly ksiaze' }).map(b => b.id), ['3']);
  assert.equal(selectBooks(books, { query: 'nieistniejący tytuł' }).length, 0);
});

test('Katalog pokazuje wszystkie oferty, własna półka używa ID sesji', () => {
  assert.equal(selectBooks(books).length, 3);
  assert.deepEqual(selectBooks(books, { view: 'shelf', userId: 'alice' }).map(b => b.id), ['1']);
  assert.deepEqual(selectBooks(books, { view: 'shelf' }), []);
  assert.deepEqual(selectBooks(books, { view: 'saved', favorites: ['2', 'deleted'] }).map(b => b.id), ['2']);
  assert.deepEqual(selectBooks([], { favorites: ['1'] }), []);
});

test('Filtrowanie, daty i rekomendacje nie zmieniają źródłowego katalogu', () => {
  assert.deepEqual(selectBooks(books, { category: 'Fantastyka' }).map(b => b.id), ['2']);
  assert.deepEqual(selectBooks(books, { sort: 'newest' }).map(b => b.id), ['3', '2', '1']);
  assert.equal(selectBooks(books, { favorites: ['2'] })[0].id, '2');
  assert.deepEqual(books.map(b => b.id), ['1', '2', '3']);
});
