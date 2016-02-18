// A convenience helper to create a lens. If you want to you can just create
// the functions directly, but this lets you avoid the logic of checking for
// undefined parameters.
//
// Example: A lens which looks at an objects 'a' property
//   let aLens = createLens(
//     obj => obj.a,
//     (obj, a) => ({...obj, a})
//   );
export function createLens(peek, set) {
  return function(value, focus) {
    if (arguments.length === 1) {
      return peek(value);
    } else {
      return set(value, focus);
    }
  }
}

// The same as createLens, however it will cache one invocation of the lens,
// which in certain cases might be beneficial. Should not be used unless the
// data being checked is not being mutated.
export function createLensMemoized(peek, set) {
  let cachedInput;
  let cachedOutput;
  let memoPeek = (v) => {
    if (v !== cachedInput) {
      cachedInput = v;
      cachedOutput = peek(v);
    }
    return cachedOutput;
  };
  return createLens(memoPeek, set);
}

// "Lift" `f` into the world of `lens`.
// If L is a lens from A to B, and F is a function from B -> B, then lift(L, F)
// is a function from A -> A.
// Example:
//   const sqr = x => x * x;
//   const sqrA = lift(aLens, sqr)
//   sqrA({ a: 2 }); // => { a: 4 }
export function lift(lens, f) {
  return function(value, ...rest) {
    return lens(value, f(lens(value), ...rest));
  }
}

// Compose a sequence of lenses, from right to left.
// Example:
//   let abLens = compose(
//     bLens, // accesses an object's 'b' property
//     aLens  // accesses an object's 'a' property
//   );
//
//   abLens({ a: { b: 3 }}); // => 3
//   abLens({ a: { b: 3 }}, 4); // => { a: { b: 4 }}
export function compose(l, ...rest) {
  if (rest.length === 0) {
    return l;
  } else {
    let others = compose(...rest);
    return createLens(
      value => l(others(value)),
      (value, focus) => others(value, l(others(value), focus))
    )
  }
}

function peekPath(path, obj) {
  let value = obj;
  for (let i = 0; i < path.length; i++) {
    if (value === undefined || !value.hasOwnProperty(path[i])) {
      return undefined;
    }
    value = value[path[i]];
  }
  return value;
}

function setPath(path, obj, val) {
  if (path.length === 0) {
    return val;
  } else {
    let [fst, ...rst] = path;
    obj = obj || {};
    return {
      ...obj,
      [fst]: setPath(rst, obj[fst], val)
    }
  }
}

// Create a lens which looks into a deeply nested object.
// Example:
//   let abLens = fromPath('a', 'b');
//
//   abLens({ a: { b: 3 }}); // => 3
//   abLens({ a: { b: 3 }}, 4); // => { a: { b: 4 }}
//
// You might note that these go in reverse order to composition.
// This is to mimic property access (x.a.b) which goes in reverse order to
// function application (b(a(x))).
export function fromPath(...path) {
  return createLens(
    value => peekPath(path, value),
    (value, focus) => setPath(path, value, focus)
  );
}

// Like fromPath, but for collections from immutableJS.
export function fromPathImmutable(...path) {
  return createLens(
    value => value.getIn(path),
    (value, focus) => value.setIn(path, focus)
  );
}

// Map a function over a lens. Equivalent to lifting and then applying.
// Example:
//   map(aLens, sqr, { a: 2 }); // => { a: 4 }
export function map(lens, f, value) {
  return lift(lens, f)(value);
}

// Given an object of lenses, creates a lens which gives an object with the
// same structure, with the value of each lens as its values.
// Note that the lenses should commute (not overlap) for this to
// work in a reasonable way.
// Example:
//   const lens = combineLenses({
//     a: fromPath('hello'),
//     b: fromPath('goodbye', 'farewell')
//   });
//
//   lens({
//     hello: 1,
//     goodbye: {
//       farewell: 2
//     }
//   }); // => { a: 1, b: 2 }
//
//   lens({
//     hello: 1,
//     goodbye: {
//       farewell: 2
//     }
//   }, { a: 3, b: 4 });
//   => {
//     hello: 3,
//     goodbye: {
//       farewell: 4
//     }
//   }
export function combineLenses(lenses) {
  let keys = Object.keys(lenses);
  let peek = value => {
    let obj = {};
    keys.forEach(k => obj[k] = lenses[k](value));
    return obj;
  };

  let set = (value, focus) =>
    keys.reduce(
      (v, k) => lenses[k](v, focus[k]),
      value
    );

  return createLens(
    peek,
    set
  );
}
