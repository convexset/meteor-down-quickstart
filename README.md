# Meteor Load Testing Framework-cum-Quickstart

This provides a "framework" and quickstart for using [meteor-down](https://github.com/meteorhacks/meteor-down) to do Meteor load testing.

This includes the [todos](https://www.meteor.com/todos) example with one added method. (*Sorry for just dumping all the code there, but this is supposed to be a quick start. I mean, for performance, we do materialize stuff...*)

Get started by installing [meteor-down](https://github.com/meteorhacks/meteor-down):
```
npm install -g meteor-down
```

Then run the todos app, and head to the `meteor-down-example` folder and run
```
./do-load-test.sh
```
... and you are... off to the races?

Have a look at `load-test.js` to get a sense of how to do clean load testing by example.

### "Clean Load Testing"

[meteor-down](https://github.com/meteorhacks/meteor-down) does not provide a lot of tooling for load testing. In fact, one can really only use a version of `Meteor.call` and `Meteor.subscribe` (... also `EJSON`). This is really not enough.

Even for the simple [todos](https://www.meteor.com/todos) example, a good load test would:
 - start subscriptions to get all lists
   * one for public lists
   * another subscriptions for private lists
 - for each list so obtained, subscribe to the list items

This means a level of asyncrony that vanilla `Meteor.subscribe` with callbacks cannot provide for. The same applies for methods. What we need are simple `Promises`.

So this is the additional stuff that is available here in this little quick start:
 - `Meteor.apply('name'[, args, callback])` without the `options` argument
 - `Meteor.call_GetPromise('name'[, args*])`: returns a `Promise` (don't pass a callback)
 - `Meteor.apply_GetPromise('name'[, args])`: returns a `Promise` (don't pass a callback)
 - `Meteor.subscribe_GetPromise('name'[, args*])`: returns a `Promise` (don't pass a callback)

This distribution also provides useful tooling:
 - [underscore](https://www.npmjs.com/package/underscore) in `Tools.underscore`
 - [lodash](https://www.npmjs.com/package/lodash)
   * "Full Build" in `Tools.lodash.fullBuild`
   * "Core Build" in `Tools.lodash.coreBuild`
   * "Functional Programming Build" in `Tools.lodash.fpBuild`
 - [OperationsQueue](https://atmospherejs.com/convexset/operations-queue) in `Tools.OperationsQueue`

In addition, for kicks:
 - `LoadTester.Promise.delay(t)`: returns a promise that resolves (to `t`) after `t` milliseconds
 - `LoadTester.Decorators.resolveRejectify(cbFunc, resolve, reject)`: returns a function that calls `resolve` on the result of calling `cbFunc` (with the appropriate calling context and arguments) and `reject` on the error thrown if there is an exception
