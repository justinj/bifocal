export function createLens(peek, set) {
  return function(value, focus) {
    if (focus === undefined) {
      return peek(value);
    } else {
      return set(value, focus);
    }
  }
}

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

export function lift(lens, f) {
  return function() {
    let args = Array.prototype.slice.call(arguments);
    let value = args[0];
    args[0] = lens(args[0]);
    return lens(value, f.apply(null, args));
  }
}

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

export function fromPath(path) {
  return createLens(
    value => peekPath(path, value),
    (value, focus) => setPath(path, value, focus)
  );
}

export function map(lens, f, value) {
  return lift(lens, f)(value);
}

export function combineLenses(lenses) {
  let keys = Object.keys(lenses);
  let peek = value => {
    let obj = {};
    keys.forEach(k => obj[k] = lenses[k](value));
    return obj;
  };

  let set = (value, focus) =>
    keys.reduce(
      (v, k) => lenses[k](v, lenses[k](focus)),
      value
    );

  return createLens(
    peek,
    set
  );
}
