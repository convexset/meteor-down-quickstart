/*

var OperationsQueue = require('operations-queue');

(function() {
	var opsQueue = new OperationsQueue({
	    availableResources: {
	        res: 1
	    },
	    singleTaskCompletionCallBack: function(tId, result) {
	        // When a single task is done
	        var info = opsQueue.getTaskData();
	        console.log("[" + tId + "] Completed. Result", result);
	        console.log("[" + tId + "] Task Duration: " + (info.taskCompletionTime[tId] - info.taskStartTime[tId]) + "ms.");
	    },
	    terminationCallBack: function(completed, incomplete) {
	        // When all done
	        console.log("All Done.");
	        console.log("Completed:", completed);
	        console.log("Incomplete:", incomplete);
	    },
	    // ... in milliseconds
	    sleep_period_between_task_starts: 0,
	    show_debug_output: false
	});

	var t1 = opsQueue.createTask({
	    name: "T1",
	    // Whether task is synchronous, actually defaults to true
	    is_synchronous: true,  
	    // Priority: higher => higher priority (defaults to 5)
	    priority: 5,
	    // Resource use. Example: {forklift: 1, driver: 1}
	    resourceUse: {res: 1},
	    taskCompletionCallBack: function(return_value) {
	        console.log("[" + this.name + "] Default callback: Task complete with output ", return_value);
	    },
	    taskDependencies: [],
	    // Note that the output of pre-requisites are passed into the task function in order
	    task: function() {
	        return 1;
	    },
	});

	var t2 = opsQueue.createTask({
	    name: "T2",
	    // Whether task is synchronous, actually defaults to true
	    is_synchronous: false,  
	    // Priority: higher => higher priority (defaults to 5)
	    priority: 5,
	    // Resource use. Example: {forklift: 1, driver: 1}
	    resourceUse: {res: 1},
	    taskCompletionCallBack: function(return_value) {
	        console.log("[" + this.name + "] Default callback: Task complete with output ", return_value);
	    },
	    taskDependencies: [],
	    // Note that the output of pre-requisites are passed into the task function in order
	    task: function() {
	        // Asynchronous tasks require a function that returns a promise that does the work asynchronously (when it is created)
	        return new Promise(function(resolve, reject) {
	            setTimeout(() => resolve("t2"), 1000);
	        });
	    },
	});

	var t3 = opsQueue.createTask({
	    name: "T3",
	    // Whether task is synchronous, actually defaults to true
	    is_synchronous: false,  
	    // Priority: higher => higher priority (defaults to 5)
	    priority: 5,
	    // Resource use. Example: {forklift: 1, driver: 1}
	    resourceUse: {},
	    taskCompletionCallBack: function(return_value) {
	        console.log("[" + this.name + "] Default callback: Task complete with output ", return_value);
	    },
	    taskDependencies: [t1, t2],
	    // Note that the output of pre-requisites are passed into the task function in order
	    task: function(arg1, arg2) {
	        // Asynchronous tasks require a function that returns a promise that does the work asynchronously (when it is created)
	        return new Promise(function(resolve, reject) {
	        	console.log('[t3]:', arg1, arg2);
	            resolve(100)
	        });
	    },
	});

	opsQueue.start();
}());

*/