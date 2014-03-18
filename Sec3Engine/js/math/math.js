SEC3 = SEC3 || {};
SEC3.math = SEC3.math || {};

/*
 * Rounds num up to the nearest power of 2
 */
SEC3.math.roundUpToPower = function(num, power) {

	var x = 1;

	while (x < num) {
		x *= power;
	}

	return x;
};