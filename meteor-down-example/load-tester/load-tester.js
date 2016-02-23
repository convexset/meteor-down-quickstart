"use strict";

function isFunction(o) {
	return Object.prototype.toString.call(o) === "[object Function]";
}

function isArray(o) {
	return Object.prototype.toString.call(o) === "[object Array]";
}

module.exports = (function() {
	var _lt = function LoadTester() {};
	var LoadTester = new _lt();

	var tasks = [];
	var taskNames = [];
	LoadTester.addTask = function addTask(name, task) {
		if (taskNames.indexOf(name) !== -1) {
			throw "duplicate-task";
		}
		if ((typeof task !== "function")) {
			throw "bad-task";
		}
		taskNames.push(name);
		tasks.push({
			name: name,
			task: task,
		});
	};

	LoadTester.runTasks = function runTasks(Meteor) {
		///////////////////////////////////////////////////////////////////////
		// Allow promise-y calls and applies
		// ... because it's ok to be abusive in a test setting...
		///////////////////////////////////////////////////////////////////////
		var meteorProto = Object.getPrototypeOf(Meteor);

		if (!Meteor.apply) {
			console.log("[LoadTester] Providing local polyfill for Meteor.apply.")
			meteorProto.apply = function Meteor_apply_polyfill() {
				if (arguments.length === 0) {
					throw new Error("invalid method call")
				}
				var methodName = arguments[0];
				var applyArgs = [methodName];
				var args, cb;

				if (arguments.length >= 2) {
					args = arguments[1];
					if (!isArray(args)) {
						throw new Error("invalid apply arguments parameter");
					}
					applyArgs = applyArgs.concat(args);
				}
				if (arguments.length >= 3) {
					cb = arguments[2];
					if (!isFunction(cb)) {
						throw new Error("invalid callback parameter");
					}
					applyArgs = applyArgs.concat(cb);
				}
				this.call.apply(this, applyArgs);
			};
		}

		if (!Meteor.call_GetPromise) {
			console.log("[LoadTester] Providing polyfill for Meteor.call_GetPromise.")
			meteorProto.call_GetPromise = function MeteorCall_GetPromise() {
				var self = this;
				var args = Array.prototype.slice.call(arguments);
				return new Promise(function(resolve, reject) {
					self.call.apply(self, args.concat(function(err, res) {
						if (!!err) {
							reject(err);
						}
						resolve(res);
					}));
				});
			};
		}

		if (!Meteor.apply_GetPromise) {
			console.log("[LoadTester] Providing polyfill for Meteor.apply_GetPromise.")
			meteorProto.apply_GetPromise = function MeteorApply_GetPromise() {
				var self = this;
				var args = Array.prototype.slice.call(arguments);
				return new Promise(function(resolve, reject) {
					self.apply.apply(self, args.concat(function(err, res) {
						if (!!err) {
							reject(err);
						}
						resolve(res);
					}));
				});
			};
		}

		if (!Meteor.subscribe_GetPromise) {
			console.log("[LoadTester] Providing polyfill for Meteor.subscribe_GetPromise.")
			meteorProto.subscribe_GetPromise = function subscribe_GetPromise() {
				var self = this;
				var args = Array.prototype.slice.call(arguments);
				return new Promise(function(resolve, reject) {
					self.subscribe.apply(self, args.concat(function(err, res) {
						if (!!err) {
							reject(err);
						}
						resolve(res);
					}));
				});
			};
		}
		///////////////////////////////////////////////////////////////////////

		var record = {};
		tasks.forEach(function(task) {
			record[task.name] = false;
		});

		function completeTask(taskName) {
			return function completeThisTask() {
				record[taskName] = true;
				console.log("~~~ [Session: " + Meteor.session + "] Completed: " + taskName + " ~~~");

				var allDone = tasks.map(task => record[task.name]).reduce((x, y) => x && y, true);
				if (allDone) {
					console.log("********** [Session: " + Meteor.session + "] " + tasks.length + " tasks done. **********");
					Meteor.kill();
				}
			};
		}

		// Run all tasks, supplying "completion notification callback"
		tasks.forEach(function(taskDesc) {
			taskDesc.task(Meteor, completeTask(taskDesc.name));
		});
	};

	LoadTester.Promise = {
		delay: function delay(t) {
			return new Promise(function(resolve, reject) {
				setTimeout(function() {
					resolve(t);
				}, t);
			});
		}
	};

	LoadTester.Decorators = {
		resolveRejectify: function resolveRejectify(cbFunc, resolve, reject) {
			return function() {
				var args = Array.prototype.slice.call(arguments);
				var result;
				try {
					result = cbFunc.apply(this, args)
					if (isFunction(resolve)) {
						resolve(result);
					}
				} catch (e) {
					if (isFunction(reject)) {
						reject(e);
					} else {
						throw e;
					}
				}
				return result;
			}
		}
	};

	LoadTester.ExternalTools = {
		underscore: require("underscore"),
		lodash: {
			fullBuild: require('lodash'),
			coreBuild: require('lodash/core'),
			fpBuild: require('lodash/fp'),
		},
		OperationsQueue: require('operations-queue')
	};

	return LoadTester;
}());