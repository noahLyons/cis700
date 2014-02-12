SEC3ENGINE = SEC3ENGINE || {};
SEC3ENGINE.math = SEC3ENGINE.math || {};

/*
 * Rounds num up to the nearest power of 2
 */
SEC3ENGINE.math.roundUpToPower = function(num, power) {

	var x = 1;

	while (x < num) {
		x *= power;
	}

	return x;
};