import assert from 'assert';
import {
  createLens,
  lift,
  fromPath,
  fromPathImmutable,
  over,
  combineLenses,
  compose
} from './index';
import * as Immutable from 'immutable';

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

describe('compose', function() {
  it('composes two lenses', function() {
    let aLens = fromPath('a');
    let bLens = fromPath('b');
    let abLens = compose(bLens, aLens); // should be equivalent to fromPath('a', 'b')

    assert.equal(abLens({ a: { b: 1 }}), 1);

    assert.deepEqual(abLens({ a: { b: 1 }}, 2), { a: { b: 2 }});
  });

  it('composes arbitrarily many lenses', function() {
    let aLens = fromPath('a');
    let bLens = fromPath('b');
    let cLens = fromPath('c');
    let abcLens = compose(cLens, bLens, aLens);

    assert.equal(abcLens({ a: { b: { c: 1 }}}), 1);
    assert.deepEqual(abcLens({ a: { b: { c: 1 }}}, 2), { a: { b: { c: 2 }}});
  });
});

describe('fromPath', function() {
  let obj = {
    a: {
      b: 1
    },
    c: 2
  }
  let lens = fromPath('a', 'b')

  it('creates a lens based on a path of keys in objects', function() {
    assert.equal(lens(obj), 1);
    assert.deepEqual(lens(obj, 3), { a: { b: 3 }, c: 2 });
  });

  it('is safe', function() {
    assert.equal(lens({}), undefined);
    assert.deepEqual(lens({}, 3), { a: { b: 3 }});
  });
});

describe('fromPathImmutable', function() {
  let map = Immutable.fromJS({
    a: {
      b: 1
    },
    c: 2
  });
  let lens = fromPathImmutable('a', 'b');

  it('creates a lens based on a path of keys', function() {
    assert.equal(lens(map), 1);
    assert.deepEqual(
      lens(map, 3).toJS(),
      {
        a: {
          b: 3
        },
        c: 2
      }
    );
  });
});

describe('over', function() {
  it('operates on the substructure', function() {
    let obj = { a: 1 };
    assert.deepEqual(
      over(aLens, x => 2, obj),
      { a: 2 }
    );
  });
});

describe('combineLenses', function() {
  it('behaves just like combineReducers', function() {
    let aLens = fromPath('a');
    let bLens = fromPath('b');
    let cLens = fromPath('c');
    let lens = combineLenses({
      a: aLens,
      b: bLens,
      d: cLens
    });

    assert.deepEqual(
      lens({ a: 1, b: 2, c: 3 }),
      { a: 1, b: 2, d: 3 }
    );

    assert.deepEqual(
      lens({ a: 1, b: 2, c: 3 }, { a: 3, b: 8, d: 12 }),
      { a: 3, b: 8, c: 12 }
    );
  });
});



describe('README examples', function() {
  describe('negationLens', function() {
    it('works as the example shows', function() {
      const negationLens = createLens(
        x => -x,
        (_, x) => -x
      );

      assert.equal(
        4,
        over(negationLens, x => x + 1, 5)
      );
    });
  });

  describe('arrayLens', function() {
    it('works as the example shows', function() {
      const arrayLens = createLens(
        s => s.split(''),
        (_, a) => a.join('')
      );

      assert.equal(
        'olleh',
        over(arrayLens, x => x.slice().reverse(), 'hello')
      );
    });
  });

  describe('division algorithm', function() {
    it('works as the example shows', function() {
      // represents division by `m`
      function division(m) {
        const quotient = n => Math.floor(n / m);
        const remainder = n => n % m;
        const quotientLens = createLens(
          n => quotient(n),
          (n, q) => q * m + remainder(n)
        );
        const remainderLens = createLens(
          n => remainder(n),
          (n, r) => quotient(n) * m + r
        );
        return {
          quotientLens,
          remainderLens
        };
      }

      const { quotientLens, remainderLens } = division(100);

      assert.equal(1, quotientLens(105));
      assert.equal(5, remainderLens(105));

      assert.equal(205, quotientLens(105, 2));
      assert.equal(127, remainderLens(105, 27));
    });
  });
});
