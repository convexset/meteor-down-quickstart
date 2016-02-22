Meteor.methods({
	"generate-random-numbers": function(n, scale) {
		this.unblock();
		check(n, Number);
		check(scale, Number);
		if (n > 1000) {
			n = 1000;
		}
		var arr = [];
		for (var k = 0; k < n; k++) {
			arr.push(scale * Math.random());
		}
		return arr;
	}
});