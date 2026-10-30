import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, selectBooks, seedBooks } from '../public/data.js';
test('Wyszukiwanie ignoruje polskie znaki i łączy tytuł z autorem',()=>{
  assert.equal(normalize('ŁÓDŹ'), 'lodz');
  assert.deepEqual(selectBooks(seedBooks,{query:'normalni rooney'}).map(b=>b.id),['b1']);
  assert.equal(selectBooks(seedBooks,{query:'nieistniejący tytuł'}).length,0);
});
test('Filtry, ulubione i własna półka nie mieszają ofert',()=>{
  assert.deepEqual(selectBooks(seedBooks,{category:'Thriller'}).map(b=>b.id),['b5']);
  assert.deepEqual(selectBooks(seedBooks,{view:'saved',favorites:['b3']}).map(b=>b.id),['b3']);
  assert.deepEqual(selectBooks(seedBooks,{view:'shelf'}).map(b=>b.id),['b8']);
  assert.ok(selectBooks(seedBooks).every(b=>b.owner!=='me'));
});
test('Wycofane oferty znikają, rekomendacje uwzględniają zapisane kategorie',()=>{
  assert.equal(selectBooks([{...seedBooks[0],withdrawn:true}]).length,0);
  assert.equal(selectBooks(seedBooks,{favorites:['b5']})[0].id,'b5');
});
