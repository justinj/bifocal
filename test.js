import assert from 'assert';
import { createLens, lift, fromPath, compose } from './index';

let aPeek = obj => obj.a;
let aSet = (obj, a) => ({...obj, a});

let aLens = createLens(aPeek, aSet);

describe('raw uses of lens', function() {
  it('peeks at an object if no substructure given', function() {
    assert.equal(aLens({ a: 1 }), 1);
  });

  it('sets a substructure if one is given', function() {
    assert.deepEqual(aLens({ a: 1 }, 2), { a: 2 });
  });
});

describe('lift', function() {
  it('lifts a function on a substructure into one that acts on a structure', function() {
    let fn = a => 2;
    let lifted = lift(aLens, fn);

    assert.deepEqual(lifted({ a: 1 }), { a: 2 });
  });

  it('lifts a function with extra arguments', function() {
    let fn = (state, action) => state + action.value;
    let lifted = lift(aLens, fn);

    let action = {
      type: 'INCREMENT',
      value: 2
    };

    assert.deepEqual(lifted({ a: 1 }, action), { a: 3 });
  });
});

describe('fromPath', function() {
  it('creates a lens based on a path of keys in objects', function() {
    let obj = {
      a: {
        b: 1
      }
    }
    let lens = fromPath(['a', 'b'])

    assert.equal(lens(obj), 1);
    assert.deepEqual(lens(obj, 3), { a: { b: 3 }});
  });
});

describe.skip('compose', function() {
  // This is cool but I'm not convinced it's useful for my purposes yet
  it('composes two lenses', function() {
    let aLens = fromPath(['a']);
    let bLens = fromPath(['b']);
    let abLens = compose(aLens, bLens); // should be equivalent to fromPath(['a', 'b'])

    assert.equal(abLens({ a: { b: 1 }}), 1);

    assert.deepEqual(abLens({ a: { b: 1 }}, 2), { a: { b: 2}});
  });

  it('composes arbitrarily many lenses', function() {
    let aLens = fromPath(['a']);
    let bLens = fromPath(['b']);
    let cLens = fromPath(['c']);
    let abcLens = compose(aLens, bLens, cLens);

    assert.equal(abcLens({ a: { b: { c: 1 }}}), 1);
    assert.deepEqual(abcLens({ a: { b: { c: 1 }}}, 2), { a: { b: { c: 2 }}});
  });
});
