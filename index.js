export function createLens(peek, set) {
  return function(value, focus) {
    if (arguments.length === 1) {
      return peek(value);
    } else {
      return set(value, focus);
    }
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

export function fromPath(...path) {
  return createLens(
    value => peekPath(path, value),
    (value, focus) => setPath(path, value, focus)
  );
}

export function lift(lens, f) {
  return function(value, ...rest) {
    return lens(value, f(lens(value), ...rest));
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

export function over(lens, f, value) {
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
      (v, k) => lenses[k](v, focus[k]),
      value
    );

  return createLens(
    peek,
    set
  );
}

export function fromPathImmutable(...path) {
  return createLens(
    value => value.getIn(path),
    (value, focus) => value.setIn(path, focus)
  );
}
