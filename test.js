import assert from 'assert';
import {
  createLens,
  createLensMemoized,
  lift,
  fromPath,
  map,
  liftReducer,
  composeLensReducers,
  combineLenses,
  compose
} from './index';

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

describe('createLensMemoized', function () {
  it('caches one invocation of the lens', function() {
    let invoked = false;
    let aPeek = obj => {
      if (invoked) assert(false, "Function called more than once!");
      invoked = true;
      return obj.a;
    };
    let aSet = (obj, a) => ({...obj, a});
    let aLens = createLensMemoized(aPeek, aSet);
    let obj = {
      a: 2
    };
    assert.equal(2, aLens(obj));
    aLens(obj);
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
    let aLens = fromPath(['a']);
    let bLens = fromPath(['b']);
    let abLens = compose(bLens, aLens); // should be equivalent to fromPath(['a', 'b'])

    assert.equal(abLens({ a: { b: 1 }}), 1);

    assert.deepEqual(abLens({ a: { b: 1 }}, 2), { a: { b: 2 }});
  });

  it('composes arbitrarily many lenses', function() {
    let aLens = fromPath(['a']);
    let bLens = fromPath(['b']);
    let cLens = fromPath(['c']);
    let abcLens = compose(cLens, bLens, aLens);

    assert.equal(abcLens({ a: { b: { c: 1 }}}), 1);
    assert.deepEqual(abcLens({ a: { b: { c: 1 }}}, 2), { a: { b: { c: 2 }}});
  });
});

describe('fromPath', function() {
  let obj = {
    a: {
      b: 1
    }
  }
  let lens = fromPath(['a', 'b'])

  it('creates a lens based on a path of keys in objects', function() {
    assert.equal(lens(obj), 1);
    assert.deepEqual(lens(obj, 3), { a: { b: 3 }});
  });

  it('is safe', function() {
    assert.equal(lens({}), undefined);
    assert.deepEqual(lens({}, 3), { a: { b: 3 }});
  });
});

describe('map', function() {
  it('operates on the substructure', function() {
    let obj = { a: 1 };
    assert.deepEqual(
      map(aLens, x => 2, obj),
      { a: 2 }
    );
  });
});

describe('lens reducers', function() {
  let obj = {
    sum: 1,
    product: 2
  };

  let sumLens = fromPath(['sum']);
  let productLens = fromPath(['product']);

  let sum = (readableState, writableState, action) => {
    if (writableState === undefined) {
      return 0;
    } else {
      return readableState + writableState + action.value;
    }
  };

  let product = (readableState, writableState, action) => {
    if (writableState === undefined) {
      return 1;
    } else {
      return readableState * writableState * action.value;
    }
  };

  let sumReducer = liftReducer(productLens, sumLens, sum);
  let productReducer = liftReducer(sumLens, productLens, product);

  describe('liftReducer', function() {
    it('creates a reducer which reads from the root state', function() {
      assert.deepEqual(
        sumReducer(obj, { type: 'ACT', value: 4 }),
        { sum: 7, product: 2 }
      );
    });

    it('is still a well-behaved reducer', function() {
      assert.deepEqual(
        sumReducer({}, { type: 'init' }),
        { sum: 0 }
      );
    });

    it('does not attempt to read from the root state when write state = undefined', function() {
      let shouldntBeCalled = createLens(() => assert(false, "I shouldn't have been called!"));
      let reducer = liftReducer(shouldntBeCalled, sumLens, sum);
      assert.deepEqual(
        reducer({}, { type: '@@redux/INIT' }),
        { sum: 0 }
      );
    });
  });

  describe('composeLensReducers', function() {
    let composed = composeLensReducers(
      sumReducer,
      productReducer
    );

    it('applies each in turn', function() {
      assert.deepEqual(
        composed(obj, { type: 'ACT', value: 4 }),
        { product: 8, sum: 13 }
      );
    });

    it('behaves nicely with respect to initial value', function() {
      assert.deepEqual(
        composed(undefined, { type: 'init' }),
        { sum: 0, product: 1 }
      );
    });
  });
});

describe('combineLenses', function() {
  it('behaves just like combineReducers', function() {
    let aLens = fromPath(['a']);
    let bLens = fromPath(['b']);
    let cLens = combineLenses({
      a: aLens,
      b: bLens
    });

    assert.deepEqual(
      cLens({ a: 1, b: 2, c: 3 }),
      { a: 1, b: 2 }
    );

    assert.deepEqual(
      cLens({ a: 1, b: 2, c: 3 }, { a: 3, b: 8 }),
      { a: 3, b: 8, c: 3 }
    );
  });
});

