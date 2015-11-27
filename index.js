export function createLens(peek, set) {
  return function(rootStructure, subStructure) {
    if (subStructure === undefined) {
      return peek(rootStructure);
    } else {
      if (set) {
        return set(rootStructure, subStructure);
      } else {
        throw new Error('Trying to set read-only lens');
      }
    }
  }
}

export function lift(lens, f) {
  return function() {
    let args = Array.prototype.slice.call(arguments);
    let structure = args[0];
    args[0] = lens(args[0]);
    return lens(structure, f.apply(null, args));
  }
}

function peekPath(path, obj) {
  let value = obj;
  for (let i = 0; i < path.length; i++) {
    if (value === undefined || !value.hasOwnProperty(path[i])) {
      return undefined;
      // I actually think undefined is correct.
      // throw new Error(
      //   'Lens ' +
      //   JSON.stringify(path) +
      //   ' was not valid in object ' +
      //   JSON.stringify(obj) +
      //   ' (' + path[i] + ')'
      // );
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
    structure => peekPath(path, structure),
    (structure, substructure) => setPath(path, structure, substructure)
  );
}

export function map(lens, f, structure) {
  return lift(lens, f)(structure);
}

export function liftReducer(read, write, f) {
  return (state, action) => {
    return write(
      state,
      f(read(state), write(state), action)
    );
  };
}

export function composeLensReducers(first, ...rest) {
  if (rest.length === 0) {
    return first;
  } else {
    let remainder = composeLensReducers(...rest);
    return (state, action) => {
      return first(remainder(state, action), action);
    };
  }
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

// This works, not convinced it's valuable to expose it yet though.
function compose(a, b, ...rest) {
  if (b === undefined) {
    return a;
  } else {
    return compose(
      createLens(
        structure => b(a(structure)),
        (structure, substructure) => a(structure, b(a(structure), substructure))
      ),
      ...rest
    );
  }
}
