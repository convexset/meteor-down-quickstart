////////////////////////////////////////////////////////////////////////////////
// Boilerplate
////////////////////////////////////////////////////////////////////////////////
var Tools = {
	underscore: require("underscore"),
	lodash: {
		fullBuild: require('lodash'),
		coreBuild: require('lodash/core'),
		fpBuild: require('lodash/fp'),
	},
	OperationsQueue: require('operations-queue')
};
var LoadTester = require("load-tester");
////////////////////////////////////////////////////////////////////////////////


LoadTester.addTask('generate-random-numbers', function(Meteor, complete) {
	Promise.all([
		new Promise(function(resolve, reject) {
			Meteor.call('generate-random-numbers', Math.floor(1000 * Math.random()), 1, function(error, result) {
				console.log('[Meteor.call] ' + result.length + ' random samples have arrived (Mean: ' + (result.reduce((x, y) => x + y, 0) / result.length) + ').');
				resolve();
			});
		}),
		new Promise(function(resolve, reject) {
			Meteor.apply(
				'generate-random-numbers',
				[Math.floor(1000 * Math.random()), 10],
				LoadTester.Decorators.resolveRejectify(function(error, result) {
					console.log('[Meteor.apply] ' + result.length + ' random samples have arrived (Mean: ' + (result.reduce((x, y) => x + y, 0) / result.length) + ').');
				}, resolve, reject)
			);
		}),
		Meteor.call_GetPromise('generate-random-numbers', Math.floor(1000 * Math.random()), 10000)
			.then(function(result) {
				console.log('[Meteor.call_GetPromise] ' + result.length + ' random samples have arrived (Mean: ' + (result.reduce((x, y) => x + y, 0) / result.length) + '). Waiting a bit...');
			})
			.then(() => LoadTester.Promise.delay(2000))
			.then(function(result) {
				console.log('[Meteor.call_GetPromise] ' + 'Done waiting.');
			}),
		Meteor.apply_GetPromise('generate-random-numbers', [Math.floor(1000 * Math.random()), 1000])
			.then(function(result) {
				console.log('[Meteor.apply_GetPromise] ' + result.length + ' random samples have arrived (Mean: ' + (result.reduce((x, y) => x + y, 0) / result.length) + ').');
			}),
	]).then(complete)
		.catch(function(err) {
			console.error(err);
		});

});

LoadTester.addTask('get-all-data', function(Meteor, complete) {
	Promise.resolve()
		.then(function() {
			// Subscribe to both public lists and private lists
			return Promise.all([
				new Promise(function(resolve, reject) {
					Meteor.subscribe('publicLists', function() {
						resolve();
					});
				}),
				Meteor.subscribe_GetPromise('privateLists')
			]);
		})
		.then(function() {
			// For each available list, subscribe to the contents of each list
			return Promise.all(
				Object.keys(Meteor.collections.lists).map(
					id => Meteor.subscribe_GetPromise('todos', id)
				)
			);
		})
		.then(function() {
			// Report what was done and complete task
			console.log(Object.keys(Meteor.collections.todos).length + ' todos from ' + Object.keys(Meteor.collections.lists).length + ' lists downloaded.');
			complete();
		});
});

meteorDown.init(LoadTester.runTasks);
meteorDown.run({
	concurrency: 1,
	url: "http://localhost:3000",
	key: "METEOR_DOWN_KEY",
	auth: {
		userIds: ['LvJQ3zmPDdsYmKeyd']
	}
});