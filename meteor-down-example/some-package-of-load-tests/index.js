module.exports = function applyTestsToLoadTester(prefix, LoadTester) {
	require("./tests/generate-random-numbers")(prefix, LoadTester);
	require("./tests/get-all-data")(prefix, LoadTester);

	return LoadTester;
};