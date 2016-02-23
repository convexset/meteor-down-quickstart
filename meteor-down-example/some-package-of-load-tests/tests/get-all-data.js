////////////////////////////////////////////////////////////////////////////////
// Boilerplate
////////////////////////////////////////////////////////////////////////////////
// var LoadTester = require("load-tester");
// var _ = LoadTester.ExternalTools.underscore;
// var _ = LoadTester.ExternalTools.lodash.fullBuild;
// var _ = LoadTester.ExternalTools.lodash.coreBuild;
// var _ = LoadTester.ExternalTools.lodash.fpBuild;
// var OperationsQueue = LoadTester.ExternalTools.OperationsQueue;
////////////////////////////////////////////////////////////////////////////////

module.exports = function applyTestsToLoadTester(prefix, LoadTester) {
	LoadTester.addTask(prefix + '|' + 'get-all-data', function(Meteor, complete) {
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
};