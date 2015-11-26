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
    if (!value.hasOwnProperty(path[i])) {
      throw new Error(
        'Lens ' +
        JSON.stringify(path) +
        ' was not valid in object ' +
        JSON.stringify(obj) +
        ' (' + path[i] + ')'
      );
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
