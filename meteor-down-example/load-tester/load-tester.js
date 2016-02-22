"use strict";

function isFunction(o) {
	return Object.prototype.toString.call(o) === "[object Function]";
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
		Meteor.apply = function Meteor_apply_polyfill() {
			var methodName, args, cb;
			if (arguments.length <= 1) {
				methodName = arguments[0];
				Meteor.call.apply(Meteor, [methodName]);
			}
			if (arguments.length === 2) {
				methodName = arguments[0];
				args = arguments[1];
				Meteor.call.apply(Meteor, [methodName].concat(args));
			}
			if (arguments.length >= 2) {
				methodName = arguments[0];
				args = arguments[1];
				cb = arguments[2];
				Meteor.call.apply(Meteor, [methodName].concat(args).concat([cb]));
			}
		};

		Meteor.call_PromiseEdition = function MeteorCall_PromiseEdition() {
			var args = Array.prototype.slice.call(arguments);
			return new Promise(function(resolve, reject) {
				Meteor.call.apply(Meteor, args.concat(function(err, res) {
					if (!!err) {
						reject(err);
					}
					resolve(res);
				}));
			});
		};

		Meteor.apply_PromiseEdition = function MeteorApply_PromiseEdition() {
			var args = Array.prototype.slice.call(arguments);
			return new Promise(function(resolve, reject) {
				Meteor.apply.apply(Meteor, args.concat(function(err, res) {
					if (!!err) {
						reject(err);
					}
					resolve(res);
				}));
			});
		};
		///////////////////////////////////////////////////////////////////////

		var record = {};
		tasks.forEach(function(task) {
			record[task.name] = false;
		});

		function completeTask(taskName) {
			return function completeThisTask() {
				record[taskName] = true;
				console.log("~~~ [" + Meteor.session + "] Completed: " + taskName + " ~~~");

				var allDone = tasks.map(task => record[task.name]).reduce((x, y) => x && y, true);
				if (allDone) {
					console.log("********** [" + Meteor.session + "] " + tasks.length + " tasks done. **********");
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
				} catch(e) {
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

	return LoadTester;
}());