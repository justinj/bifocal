Bifocal
=======

Install
=======

```bash
$ npm install --save bifocal
```

Usage
=====

This is not an explanation of lenses in general, just how they're implemented in this library.

A lens, with respect to this library, is a function which takes either one or two arguments.
When given one, it returns the result of focusing on that value.
When given two, it returns the result of inserting the second argument into the first.

##A Quick Example

```javascript
import {
  createLens,
  lift
} from 'bifocal';

// A lens which gets and sets the `a` property of some object
let aPeek = obj => obj.a;
let aSet = (obj, a) => ({...obj, a});
let aLens = createLens(aPeek, aSet);

aLens({ a: 1 }); // => 1
aLens({ a: 1 }, 2); // => { a: 2 }

const sqr = x => x * x;

const sqrA = lift(aLens, sqr)
sqrA({ a: 2 }); // => { a: 4 }
```

See `index.js` for the complete documentation of all the functions provided.
See `test.js` for more detailed examples.
