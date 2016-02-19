Bifocal
=======

Install
=======

```bash
$ npm install --save bifocal
```

Motivation
==========

This isn't intended to be a thorough explanation of what lenses are, but here's
one way to think about them:

Many functions can be thought of as extracting some value from another value.
For example, we might have the function `fst` (first) which takes the first element of a pair:

```javascript
const fst = ([a, _]) => a;
fst([1, 2]); // => 1
```

This function captures the idea that we can take a pair and take the first thing out of it.
What it doesn't let us do is *put the first thing back*.
I can't, with this one function, take out the first thing, add 1 to it, and then re-insert it into the pair.
For this we can use a lens.
To make a lens, we need both a way to look at the value (`fst` already does this) and put it back.
To put it back we can use `putFst`:

```javascript
const putFst = ([_, b], a) => [a, b];
putFst([1, 2], 3); // => [3, 2]
```

Note that these are all pure functions, so we never mutate the values passed in.
With `fst` and `putFst`, we can create a lens:

```javascript
const fstLens = createLens(fst, putFst);
```

and with this, we can take out a value, change it, and put it back, all in one action:

```javascript
over(fstLens, x => x + 1, [1, 3]); // => [2, 3]
```

`over` takes out the value, applies a function to it, and then puts it back.
In this case, we took out the value `1`, applied `x => x + 1` to get `2`, and
then re-inserted it to `[1, 3]` to get `[2, 3]`.

A lens, with respect to this library, is a function which takes either one or two arguments.
When given one, it returns the result of focusing on that value (we'll call this "getting").
When given two, it returns the result of inserting the second argument into the first (we'll call this "putting").
`createLens` is just a helper that takes two separate functions and makes them satisfy this interface.

Usage
=====

```javascript
import {
  createLens,
  over,
  lift
} from 'bifocal';

// A lens which gets and puts the `a` property of some object
let aGet = obj => obj.a;
let aPut = (obj, a) => ({...obj, a});
let aLens = createLens(aGet, aPut);

aLens({ a: 1 }); // => 1
aLens({ a: 1 }, 2); // => { a: 2 }

const sqr = x => x * x;

over(aLens, sqr, { a: 2 }); // => { a: 4 }

const sqrA = lift(aLens, sqr)
sqrA({ a: 2 }); // => { a: 4 }
```

See `test.js` for more detailed examples.

##API

###`createLens(get, put)`

A convenience helper to create a lens. If you want to you can just create
the lenses directly, but this lets you avoid the logic of checking the
number of arguments.

Example: A lens which looks at an object's `a` property

```javascript
let aLens = createLens(
  obj => obj.a,
  (obj, a) => ({...obj, a})
);
```
###`compose(...lenses)`

Compose a sequence of lenses from right to left.

Example:
```
let abLens = compose(
  bLens, // accesses an object's 'b' property
  aLens  // accesses an object's 'a' property
);

abLens({ a: { b: 3 }}); // => 3
abLens({ a: { b: 3 }}, 4); // => { a: { b: 4 }}
```

###`fromPath(...path)`

Create a lens which looks into a deeply nested object.

Example:
```javascript
let abLens = fromPath('a', 'b');

abLens({ a: { b: 3 }}); // => 3
abLens({ a: { b: 3 }}, 4); // => { a: { b: 4 }}
```

You might notice that these go in reverse order to composition.
This is to mimic property access (`x.a.b`) which goes in reverse order to
function application (`b(a(x))`).


###`lift(lens, f)`

"Lift" `f` into the world of `lens`.
If L is a lens from A to B, and F is a function from B -> B, then lift(L, F)
is a function from A -> A.

Example:
```javascript
const sqr = x => x * x;
const sqrA = lift(aLens, sqr)
sqrA({ a: 2 }); // => { a: 4 }
```

###`over(lens, f, value)`

Apply a function `over` a lens. Equivalent to lifting and then applying.
Conceptually similar to `map`.

Example:
```javascript
over(aLens, sqr, { a: 2 }); // => { a: 4 }
```

###`combineLenses({ <name>: lens, ... })`

Given an object of lenses, creates a lens which gives an object with the
same structure, with the value of each lens as its values.
Note that the lenses should commute (not overlap) for this to
work in a reasonable way.

Example:
```javascript
const lens = combineLenses({
  a: fromPath('hello'),
  b: fromPath('goodbye', 'farewell')
});

lens({
  hello: 1,
  goodbye: {
    farewell: 2
  }
}); // => { a: 1, b: 2 }

lens({
  hello: 1,
  goodbye: {
    farewell: 2
  }
}, { a: 3, b: 4 });
=> {
  hello: 3,
  goodbye: {
    farewell: 4
  }
}
```

###`fromPathImmutable(...path)`

Like fromPath, but for collections from [ImmutableJS](https://github.com/facebook/immutable-js).

##Extra Stuff

You don't need to read this, but it might be interesting/helpful.

###Lenses that make sense

You might notice that we can't use any old functions with `createLens` to get a
lens that always works properly.
For example, what if our putter put the value back in a different place than the getter looked?

```javascript
const what = createLens(
  ([a, _]) => a,
  ([a, _], b) => [a, b]
);
```

This doesn't really work how we want:

```javascript
over(what, x => x + 1, [1, 100]); // => [1, 2]
```

To avoid this, there are 3 rules that if followed, guarantee a lens will work in a way that is reasonable.

###1: Put-Put

If we put something into a value, and then put something else, it should be as if we only put the second thing.

That is,
```javascript
lens(lens(x, a), b) === lens(x, b)
```

###2: Put-Get

If we put something into a value using a lens, and then read from the result, we should get back what we put.

Meaning,
```javascript
lens(lens(x, a)) === a
```

###3: Get-Put

If we read something from a value using a lens, and then put that thing back, nothing should change.

```javascript
lens(x, lens(x)) === x
```

(this is the one that the lens `what` above, breaks)

###More lenses

The most obvious kind of lens is one that looks at a small part of a large value, like `fstLens` does.
You can do this basically any time you have a function whose operation can be reversed given the original value.

In particular it works with any bijection (or, function which can be inverted):
```javascript
const negationLens = createLens(
  x => -x,
  (_, x) => -x
);

over(negationLens, x => x + 1, 5); // => 4
```

In this case, this diagram might look familiar (but no worries if it doesn't):

```
  A    -- f ->    B
  
  |               ^
  |               |
  h             h^{-1}
  |               |
  v               |

  A'   -- g ->    B'
```

You can operate on strings as if they are arrays of characters:
```javascript
const arrayLens = createLens(
  s => s.split(''),
  (_, a) => a.join('')
);

over(arrayLens, x => x.slice().reverse(), "hello"); // => "olleh"
```

It should be noted that `negationLens` and `arrayLens` aren't using all of the
power available to lenses, however, since they ignore the original value (this
is because they're bijections).

Another sort of weird example: the division algorithm says that given numbers
`m` and `n`, there exists a unique *quotient* `q` and *remainder* `r` such that
```
n = qm + r
```
where r < m.

So for example, if `m = 102` and `n = 5`, then `q = 20` and `r = 2`.

We can create a lens that focuses on the quotient or remainder for a given number.
```javascript
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

// 105 = 1 * 100 + 5
quotientLens(105); // => 1
remainderLens(105); // => 5

quotientLens(105, 2); // => 205
remainderLens(105, 27); // => 127
```
