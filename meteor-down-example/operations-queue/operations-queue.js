/* global OperationsQueue: true */

(function(root, name, factory) {
	if (typeof module === "object" && module.exports) {
		// Node or CommonJS
		module.exports = factory(require("underscore"));
	} else {
		// The Else Condition

		if (typeof define === "function" && define.amd) {
			// AMD... but why?
			define(["underscore"], function(_) {
				return factory(_);
			});
		}

		// Find the global object for export to both the browser and web workers.
		var globalObject = (typeof window === 'object') && window ||
			(typeof self === 'object') && self;

		var thingie = factory(_);
		root[name] = thingie;
		if (!!globalObject) {
			globalObject[name] = thingie;
		}

		// Poor Meteor
		OperationsQueue = thingie;
	}
}(this, 'OperationsQueue', factoryOperationsQueue));

function factoryOperationsQueue(_) {
	'use strict';

	var DEBUG_MODE = false;

	/*
	 * Operations Queue
	 *
	 * Handles a synchronous task queue allowing for resource boundedness (e.g.:
	 * hash only one file at once, and upload at most three files at once)
	 * and simple task precedences (e.g.: hash file X before uploading it)
	 *
	 * TO DO: Make everything async
	 *
	 */

	var pastIds = {
		'': null
	};

	function fakeId() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}
		var this_attempt = '';
		var attempt_counts_left = 1000000000;
		while ((this_attempt in pastIds) && (attempt_counts_left > 0)) {
			this_attempt = s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4();
			attempt_counts_left -= 1;
		}
		if (attempt_counts_left === 0) {
			throw "failed-to-generate-fake-id";
		}
		pastIds[this_attempt] = 1;
		return this_attempt;
	}

	// ---------------------------------------------------

	/**
	 *  OperationsQueue Constructor
	 *  @param Object options.availableResources
	 *  @param Function options.singleTaskCompletionCallBack
	 *  @param Function options.terminationCallBack
	 *  @param int options.sleep_period_between_processing
	 *  @return OperationsQueue opsQueue
	 */
	function OperationsQueue(options) {

		// Default Options
		options = _.extend({
			// A dictionary of resources available for work
			// Example: {tables: 2, chairs: 10}
			availableResources: {},

			// The global call back that will be run after the completion
			// of each task. It will be called with the task id as input
			singleTaskCompletionCallBack: DEBUG_MODE ? function(tId, result) {
				console.log("[" + tId + "] Completed. Result", result);
				console.log("[" + tId + "] Task Duration: " + (taskCompletionTime[tId] - taskStartTime[tId]) + "ms.");
			} : function() {},

			// The call back that will be run if a running OperationsQueue
			// stops running because nothing is presently running and nothing
			// else can be run (when execution terminates)
			terminationCallBack: DEBUG_MODE ? function(completed, incomplete) {
				console.log("All Done.");
				console.log("Completed:", completed);
				console.log("Incomplete:", incomplete);
			} : function() {},

			// Adds a bit of sleep time between task starts
			sleep_period_between_task_starts: 0,

			// Exactly what it means
			show_debug_output: DEBUG_MODE
		}, options);

		var taskSequences = {};
		var taskStartTime = {};
		var taskCompletionTime = {};
		var availableResources = _.extend({}, options.availableResources);


		// Returns information on tasks
		this.getTaskData = function getTaskData() {
			return {
				taskSequences: _.map(taskSequences, function(v, k) {
					return k;
				}),
				taskStartTime: _.extend({}, taskStartTime),
				taskCompletionTime: _.extend({}, taskCompletionTime),
				taskDuration: _.object(_.map(taskCompletionTime, function(v, k) {
					return [k, taskCompletionTime[k] ? taskCompletionTime[k] - taskStartTime[k] : null];
				}))
			};
		};


		// Get list of tasks
		function getTaskList() {
			var taskList = [];
			for (var key in taskSequences) {
				if (taskSequences.hasOwnProperty(key)) {
					taskList.push(key);
				}
			}
			return taskList;
		}
		Object.defineProperty(this, 'taskList', {
			get: getTaskList,
			enumerable: true,
			configurable: false
		});


		// Get dictionary of available resources
		function getAvailableResources() {
			return _.extend({}, availableResources);
		}
		Object.defineProperty(this, 'currentAvailableResources', {
			get: getAvailableResources,
			enumerable: true,
			configurable: false
		});


		// Get dictionary of total resources
		function getTotalResources() {
			return _.extend({}, options.availableResources);
		}
		Object.defineProperty(this, 'totalResources', {
			get: getTotalResources,
			enumerable: true,
			configurable: false
		});


		// Create a task
		// Tasks can be created while the queue is running
		// but no when the OperationsQueue has been ABORTED
		this.createTask = function(taskOptions) {
			if (status === STATUS_ABORTED) {
				throw "operations-aborted";
			}

			// Default options
			taskOptions = _.extend({
				name: "task",

				// Either a function that returns a value when complete
				// (a synchronous task) or a function that returns a promise
				// that resolves to the desired output
				//
				// Note: For tasks, which are functions, please pre-bind stuff
				// Functions will be called with apply with "thisArg" = {}
				//
				// See caveat on is_synchronous below
				task: function defaultTask() {
					console.log("[" + this.name + "] Default task called with arguments ", arguments);
					return arguments.length > 0 ? _.map(arguments, function identity(x) {
						return x;
					}) : this.name;
				},

				// True if task is synchronous, false if task is not.
				// See above
				//
				// Note: user declared "synchronous tasks" (as announced by
				// this flag) that return a Promise will result in an error
				// being thrown and the queue being aborted
				is_synchronous: true,

				// Priority: higher => higher priority
				priority: 5,

				// Resource use. Example: {forklift: 1, driver: 1}
				resourceUse: {},

				// 
				taskCompletionCallBack: DEBUG_MODE ? function(return_value) {
					console.log("[" + this.name + "] Default callback: Task complete with output ", return_value);
				} : function() {},

				// Task IDs of pre-requisite tasks
				//
				// For tasks that are functions, the arguments passed in
				// will be the return value of pre-requisite tasks in order
				// e.g.: taskDependencies: ['11', '22']
				//       => Invocation: task([return value of 11], [return value of 22])
				//
				// For tasks that are of type AsyncWorkPiece, those arguments
				// will be placed in an array and placed in the params
				// dictionary (see AsyncWorkPiece.go()) under the key
				// "OperationsQueue_input".
				taskDependencies: []
			}, taskOptions);

			var taskId = taskOptions.name + " [" + fakeId() + "]";
			taskOptions.id = taskId;
			delete taskOptions.output;

			// Check taskOptions.taskDependencies
			//  - type
			//  - existence of task IDs
			if (!_.isArray(taskOptions.taskDependencies)) {
				throw "invalid-task-dependencies";
			}
			for (var i = 0; i < taskOptions.taskDependencies.length; i++) {
				var requiredTaskId = taskOptions.taskDependencies[i];
				if (!(requiredTaskId in taskSequences)) {
					throw "required-task-id-not-found: " + requiredTaskId;
				}
			}

			// Ensures total resources can support task
			var availableResources = getTotalResources();
			for (var res in taskOptions.resourceUse) {
				if (taskOptions.resourceUse.hasOwnProperty(res)) {
					if (!(res in availableResources) || availableResources[res] < taskOptions.resourceUse[res]) {
						throw "not-resource-feasible";
					}
				}
			}

			taskSequences[taskId] = taskOptions;
			return taskId;
		};


		// Exactly what it says:
		//  - checks that dependencies are already done
		//  - checks if the required resources are presently available
		function canTaskRun(taskId) {
			if (!(taskId in taskSequences)) {
				throw "taskId not found";
			}
			for (var i = 0; i < taskSequences[taskId].taskDependencies.length; i++) {
				var requiredTaskId = taskSequences[taskId].taskDependencies[i];
				if (!(requiredTaskId in taskCompletionTime) || (taskCompletionTime[requiredTaskId] === null)) {
					return false;
				}
			}
			var availableResources = getAvailableResources();
			for (var res in taskSequences[taskId].resourceUse) {
				if (taskSequences[taskId].resourceUse.hasOwnProperty(res)) {
					if (availableResources[res] < taskSequences[taskId].resourceUse[res]) {
						return false;
					}
				}
			}
			return true;
		}
		// this.canTaskRun = canTaskRun;


		// Picks one of the highest priority tasks that can be run and are
		// not yet started, and returns the task ID. Returns null if no such
		// tasks can be found.
		function getNextTask() {
			var runnableTasks = _.filter(taskSequences, function(task, tid) {
				return (!(tid in taskStartTime) && canTaskRun(tid));
			});
			if (options.show_debug_output) {
				console.log("Runnable tasks: ", runnableTasks);
			}
			if (runnableTasks.length === 0) {
				return null;
			} else {
				var sortedTasks = runnableTasks.sort(function(o1, o2) {
					return o2.priority - o1.priority;
				});
				return sortedTasks[0].id;
			}
		}


		// Status-es
		var STATUS_READY = 0,
			STATUS_ABORTED = 1,
			STATUS_RUNNING = 2;
		var STATUS_MAP = {};
		STATUS_MAP[STATUS_READY] = "READY";
		STATUS_MAP[STATUS_ABORTED] = "ABORTED";
		STATUS_MAP[STATUS_RUNNING] = "RUNNING";
		var status = STATUS_READY;

		// Returns status
		function getStatus() {
			return STATUS_MAP[status];
		}
		Object.defineProperty(this, 'status', {
			get: getStatus,
			enumerable: true,
			configurable: false
		});

		// Returns status code
		function getStatusCode() {
			return status;
		}
		Object.defineProperty(this, 'statusCode', {
			get: getStatusCode,
			enumerable: true,
			configurable: false
		});


		var fresh_start;

		// Starts the OperationsQueue working
		this.start = function() {
			if (status === STATUS_ABORTED) {
				throw "start-error: " + getStatus();
			}
			if (status === STATUS_READY) {
				fresh_start = true;
			}
			status = STATUS_RUNNING;
			doNextTask();
		};

		// Aborts the work of the OperationsQueue
		// Irreversible. Does not actually stop tasks, just prevents
		// new ones from running and prevents new tasks from being
		// created (obviously)
		this.abort = function() {
			if (status !== STATUS_RUNNING) {
				throw "operations-not-running";
			}
			status = STATUS_ABORTED;
		};


		// Attempts to get start a new piece of work
		// (This code is pretty much self documenting...)
		function doNextTask() {
			if (options.show_debug_output) {
				console.log("****************************");
				console.log("* Looking for stuff to do");
				console.log("****************************");
			}
			if (status !== STATUS_RUNNING) {
				if (options.show_debug_output) {
					console.log("doNextTask: " + getStatus() + " -> not doing next task");
				}
				return;
			}

			// Try to find work
			var taskId = getNextTask();
			if (options.show_debug_output) {
				console.log("Next Task: " + taskId);
			}

			if (!taskId) {
				// Nothing more to do... for now


				// Check if anything is currently in process
				var nothing_running = true;
				for (var ctid in taskCompletionTime) {
					if (taskCompletionTime[ctid] === null) {
						nothing_running = false;
						break;
					}
				}

				// No tasks that can be run & nothing running
				if (nothing_running) {
					// Complete if nothing more to do
					if (options.show_debug_output) {
						console.log("Nothing Running: Terminating.");
					}
					status = STATUS_READY;

					var completed = [];
					var incomplete = [];
					for (var tid in taskSequences) {
						if (tid in taskCompletionTime) {
							completed.push(tid);
						} else {
							incomplete.push(tid);
						}
					}
					status = STATUS_READY;
					options.terminationCallBack(completed, incomplete);
				}
			} else {
				// ---------------------------------------
				// There is work to be done: taskId found
				// ---------------------------------------
				if (options.show_debug_output) {
					console.log("Starting Task: " + taskId);
				}

				// Mark task as started
				taskStartTime[taskId] = (new Date()).getTime();
				taskCompletionTime[taskId] = null;

				if (options.show_debug_output) {
					console.log("[Utilizing] Initial Resources: ", getAvailableResources());
					console.log("[Utilizing] Total Resources: ", getTotalResources());
				}

				// Reserve resources before start
				for (var res in taskSequences[taskId].resourceUse) {
					if (taskSequences[taskId].resourceUse.hasOwnProperty(res)) {
						availableResources[res] -= taskSequences[taskId].resourceUse[res];
					}
				}

				if (options.show_debug_output) {
					console.log("[Utilizing] Current Resources: ", getAvailableResources());
				}

				// Create task wrapper
				var taskWrapper = function() {
					if (options.show_debug_output) {
						console.log("Running: " + taskId);
					}

					// For storing return value
					var return_value;

					// Free resources and run post-task housekeeping and
					// administration after task completes
					var cleanUp = function cleanUp() {
						// Return value will be set by this time
						// (Check below if unsure...)

						if (options.show_debug_output) {
							console.log("Done: " + taskId, return_value);
						}

						if (options.show_debug_output) {
							console.log("[Restoring] Initial Resources: ", getAvailableResources());
							console.log("[Restoring] Total Resources: ", getTotalResources());
						}

						// Free resources
						for (var res in taskSequences[taskId].resourceUse) {
							if (taskSequences[taskId].resourceUse.hasOwnProperty(res)) {
								availableResources[res] += taskSequences[taskId].resourceUse[res];
							}
						}
						if (options.show_debug_output) {
							console.log("[Restoring] Current Resources: ", getAvailableResources());
						}

						// Declare complete
						taskCompletionTime[taskId] = (new Date()).getTime();

						taskSequences[taskId].taskCompletionCallBack(return_value);
						if (status !== STATUS_ABORTED) {
							options.singleTaskCompletionCallBack(taskId, return_value);
						}

						// Check if there is more work to do
						setTimeout(doNextTask, 0);
					};

					// Prepare input arguments
					var inputArray = _.map(taskSequences[taskId].taskDependencies, function(k) {
						return taskSequences[k].output;
					});

					// Synchronous Task
					if (options.show_debug_output) {
						console.log('Starting Task');
					}

					// Promisify and handle everything accordingly
					return_value = null;
					new Promise(function(resolve, reject) {
						// do this instead of Promise.resolve so exceptions are caught inside
						resolve(taskSequences[taskId].task.apply({}, inputArray));
					})
						.then(function setReturnValueAndCleanUp(result) {
							return_value = {
								result: result
							};
							taskSequences[taskId].output = return_value;
							cleanUp();
						})
						.catch(function processErrorAndCleanUp(err) {
							return_value = {
								error: err
							};
							taskSequences[taskId].output = return_value;
							cleanUp();
						});

				};

				// Queue task up
				setTimeout(taskWrapper, fresh_start ? 0 : options.sleep_period_between_processing);

				// Not a fresh start any more
				fresh_start = false;

				// Check for new work: try again
				doNextTask();
			}
		}
	}

	OperationsQueue.debugModeOn = function debugModeOn() {
		DEBUG_MODE = true;
	};
	OperationsQueue.debugModeOnForDuration = function debugModeOnForDuration(t) {
		DEBUG_MODE = true;
		setTimeout(OperationsQueue.debugModeOff, t);
	};
	OperationsQueue.debugModeOff = function debugModeOff() {
		DEBUG_MODE = false;
	};

	return OperationsQueue;
};