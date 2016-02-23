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
	LoadTester.addTask(prefix + '|' + 'generate-random-numbers', function(Meteor, complete) {
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
}